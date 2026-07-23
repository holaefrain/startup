const express = require("express");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { ObjectId } = require("mongodb");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { USER_FIELDS, pickFields } = require("./userSchema");

// Credentials live on the same `users` document the signup wizard creates (matched by email) rather than a separate collection, so a profile created via POST /api/signup and credentials registered here end up as one document per person. Because of that, registration only 409s when the matched user already has a `password` set - a bare profile doc with no credentials yet (the normal case right after /api/signup) is fair game to register against.

const router = express.Router();

// Shared by register + login: both are "guess a credential" actions against the same account, so they draw from one per-IP budget. 20/15min is loose enough for a real user mistyping a password a few times, tight enough to blunt brute-forcing/enumeration.

const credentialRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many attempts. Please try again later." },
});

// Looser than the above - the signup wizard calls this on every field blur, so a real user fixing a typo across email/phone can legitimately trigger it several times in one sitting.

const existsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many attempts. Please try again later." },
});

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  });
}

// Registers credentials onto an existing bare profile doc - never creates one from scratch (no more upsert), since a credential-only account with no profile was never a real intended state. Prefers targeting the exact doc by `userId` (the id POST /api/signup just returned) rather than re-resolving by email a second time - if two bare docs happen to share an email (e.g. an old one left over from before a duplicate-prevention fix shipped), an unordered email lookup could silently register the wrong one, stranding the caller's actual just-submitted data on an orphaned duplicate. `userId` is optional only for workflows that create a bare doc outside of POST /api/signup (e.g. server/seedAdminUser.js's direct Mongo insert) - in that fallback path, more than one bare candidate for the same email means we can't tell which one is meant, so this refuses rather than guessing.
// Service Deilverable: Supports registration
router.post("/auth", credentialRateLimit, async (req, res) => {
  const { email, password, userId } = req.body;
  const db = await getDb();
  const users = db.collection("users");

  let existing;
  if (userId) {
    if (typeof userId !== "string" || !ObjectId.isValid(userId)) {
      res.status(400).json({ msg: "Invalid userId." });
      return;
    }
    existing = await users.findOne({ _id: new ObjectId(userId) });
    if (existing && existing.email !== email) {
      res.status(400).json({ msg: "Email does not match this profile." });
      return;
    }
  } else {
    const candidates = await users.find({ email }).toArray();
    if (candidates.some((doc) => doc.password)) {
      res.status(409).json({ msg: "Existing user" });
      return;
    }
    if (candidates.length > 1) {
      res.status(409).json({ msg: "Multiple profiles share this email - registration must specify which one (userId)." });
      return;
    }
    existing = candidates[0];
  }

  if (!existing) {
    res.status(404).json({ msg: "Profile not found. Sign up first." });
    return;
  }
  if (existing.password) {
    res.status(409).json({ msg: "Existing user" });
    return;
  }

  // Service Deilverable: Uses BCrypt to hash passwords
  const passwordHash = await bcrypt.hash(password, 10);
  const token = uuidv4();
  try {
    await users.updateOne(
      { _id: existing._id },
      { $set: { password: passwordHash, token, registered: true } }
    );
  } catch (err) {
    // The phone_unique_registered index only applies once password is set, so this is the first point a duplicate phone across two different accounts can actually surface - without this catch it'd crash into a generic 500 instead of a proper 409.
    if (err.code === 11000) {
      const field = err.keyPattern?.phone ? "phone number" : "email";
      res.status(409).json({ msg: `That ${field} is already registered to another account.` });
      return;
    }
    throw err;
  }

  setAuthCookie(res, token);
  res.json({ email });
});

// Service Deilverable: Supports login
router.put("/auth", credentialRateLimit, async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  const users = db.collection("users");

  const user = await users.findOne({ email });
  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  const token = uuidv4();
  await users.updateOne({ email }, { $set: { token } });
  setAuthCookie(res, token);
  res.json({ email });
});

// Service Deilverable: Supports logout
router.delete("/auth", async (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    const db = await getDb();
    await db.collection("users").updateOne({ token }, { $unset: { token: "" } });
  }
  res.clearCookie("token");
  res.json({});
});

// Lets the signup wizard warn about a taken email/phone on step 1, instead
// of only failing at the final submit. No auth required - the applicant
// isn't logged in yet. Both only count as taken if the matched doc already
// has a `password` set (same rule POST /auth uses for email) - a bare
// profile doc left behind by a signup that got interrupted before
// POST /auth (e.g. that request failing) shouldn't permanently block a
// real retry with the same email/phone.
router.get("/users/exists", existsRateLimit, async (req, res) => {
  const { email, phone } = req.query;
  const db = await getDb();
  const users = db.collection("users");

  const result = {};
  if (email) {
    const existing = await users.findOne({ email });
    result.email = !!existing?.password;
  }
  if (phone) {
    const existing = await users.findOne({ phone });
    result.phone = !!existing?.password;
  }
  res.json(result);
});

// Doubles as the frontend's single source of truth for the logged-in user's own full profile (src/context/AuthContext.jsx), not just a session check - pickFields(user, USER_FIELDS) already includes email, and deliberately can't include password/token/registered since those aren't in USER_FIELDS.
// Service Deilverable: Restricted endpoint
router.get("/user/me", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    // Service Deilverable: Restricted endpoint - 401 without a valid session
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  res.json({
    id: user._id.toString(),
    ...pickFields(user, USER_FIELDS),
    photoKeys: user.photoKeys ?? [],
    visibility: user.visibility ?? {},
  });
});

module.exports = router;
