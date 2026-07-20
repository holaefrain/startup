const express = require("express");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
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

router.post("/auth", credentialRateLimit, async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  const users = db.collection("users");

  const existing = await users.findOne({ email });
  if (existing?.password) {
    res.status(409).json({ msg: "Existing user" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = uuidv4();
  try {
    await users.updateOne(
      { email },
      { $set: { email, password: passwordHash, token, registered: true }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
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
router.get("/user/me", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
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
