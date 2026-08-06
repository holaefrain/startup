const express = require("express");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { setAuthCookie } = require("./authCookie");
const { deleteUsersCompletely } = require("./accountCascade");
const { closeConnectionsForUser } = require("./websocket");

// Account-level state that isn't part of the profile: things you'd change about the account itself rather than about what other people see. Kept out of server/profile.js because PATCH /api/profile is allow-listed against PROFILE_EDITABLE_FIELDS by design, and none of these are profile fields.

const router = express.Router();

// Generous by the standards of server/auth.js's 20/15min - this guards a switch a real user may flip a few times while deciding, so it's set to blunt scripted abuse rather than to ration ordinary use. improvements.md flags PATCH /api/profile as having no limiter at all; this router starts with one instead of acquiring one later.
const accountWriteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many changes. Please try again later." },
});

// Tighter than the above, and matched to server/auth.js's 20/15min for the same reason: every route it guards takes the account's current password, which makes each one a "guess a credential" surface no different from the login form.
const credentialRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many attempts. Please try again later." },
});

// Same shape as server/profile.js's - rejects before any body handling, and every route below reads req.user._id from the session rather than trusting an id in the request.
async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}

// Every credential change re-checks the current password rather than trusting the session alone. A session cookie proves the browser was logged in at some point; it doesn't prove the person at the keyboard is the account holder, which is the whole risk with an unattended machine. Returns a bad-password response the caller can hand straight to res, or null when it checks out.
async function verifyCurrentPassword(user, currentPassword) {
  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return { status: 400, body: { error: "Your current password is required." } };
  }
  // A user document can exist without a password (a bare profile from an interrupted signup - see server/auth.js), and bcrypt.compare against undefined throws rather than returning false.
  if (!user.password || !(await bcrypt.compare(currentPassword, user.password))) {
    return { status: 401, body: { error: "That password doesn't match your account." } };
  }
  return null;
}

// Signup marks the password field `required` and nothing more (src/pages/Signup/steps/AccountStep.jsx), so this is the app's first actual length rule. Applied only where a password is being chosen fresh - an existing short password still logs in fine, it just can't be replaced with another short one.
const MIN_PASSWORD_LENGTH = 8;

// Reuses the shape the signup wizard already validates against, so a number accepted there can't be rejected here.
const PHONE_PATTERN = /^\+?(\d[\s\-.]?){7,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Both unique indexes (email_unique_registered, phone_unique_registered) are partial on `password` existing, so a collision only surfaces on write - there's no reliable read-then-write check, and attempting one would be a race anyway. 11000 is therefore the real guard, not a fallback.
function duplicateKeyResponse(error, field) {
  if (error.code !== 11000) return null;
  return { status: 409, body: { error: `That ${field} is already registered to another account.` } };
}

router.put("/account/password", credentialRateLimit, requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const bad = await verifyCurrentPassword(req.user, currentPassword);
  if (bad) {
    res.status(bad.status).json(bad.body);
    return;
  }

  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    return;
  }

  // Service Deilverable: Uses BCrypt to hash passwords - 10 rounds, matching server/auth.js so a password set here and one set at registration are stored identically.
  const password = await bcrypt.hash(newPassword, 10);
  // Rotated on purpose: a password change is how someone locks out a session they no longer control, and leaving the old token valid would defeat that. The new cookie below keeps *this* browser signed in, so only the other sessions drop.
  const token = uuidv4();

  const db = await getDb();
  await db.collection("users").updateOne({ _id: req.user._id }, { $set: { password, token } });

  setAuthCookie(res, token);
  res.json({ ok: true });
});

router.put("/account/email", credentialRateLimit, requireAuth, async (req, res) => {
  const { currentPassword, email } = req.body;

  const bad = await verifyCurrentPassword(req.user, currentPassword);
  if (bad) {
    res.status(bad.status).json(bad.body);
    return;
  }

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    res.status(400).json({ error: "That doesn't look like an email address." });
    return;
  }

  // Trimmed but deliberately not lower-cased: nothing else in this app normalises case (signup stores what it's given, login does an exact findOne, and the unique index is on the raw value), so folding it here would let someone register an address that then can't be logged into.
  const next = email.trim();

  const db = await getDb();
  try {
    await db.collection("users").updateOne({ _id: req.user._id }, { $set: { email: next } });
  } catch (error) {
    const conflict = duplicateKeyResponse(error, "email address");
    if (!conflict) throw error;
    res.status(conflict.status).json(conflict.body);
    return;
  }

  // No confirmation step, because this app sends no mail - worth knowing that changing this field moves the login identity immediately, with nothing proving the new address is reachable.
  res.json({ email: next });
});

router.put("/account/phone", credentialRateLimit, requireAuth, async (req, res) => {
  const { currentPassword, phone } = req.body;

  const bad = await verifyCurrentPassword(req.user, currentPassword);
  if (bad) {
    res.status(bad.status).json(bad.body);
    return;
  }

  if (typeof phone !== "string" || !PHONE_PATTERN.test(phone.trim())) {
    res.status(400).json({ error: "That doesn't look like a phone number." });
    return;
  }

  const next = phone.trim();

  const db = await getDb();
  try {
    await db.collection("users").updateOne({ _id: req.user._id }, { $set: { phone: next } });
  } catch (error) {
    const conflict = duplicateKeyResponse(error, "phone number");
    if (!conflict) throw error;
    res.status(conflict.status).json(conflict.body);
    return;
  }

  res.json({ phone: next });
});

// Hides the account from GET /api/discover without touching anything else - existing matches, messages and swipes all survive, which is what the control on the Settings page promises.
//
// Deliberately its own field rather than a reuse of `registered`. That flag looks like the obvious switch (server/discover.js already filters on it) but it also backs the bare_profile_ttl index in server/index.js, which expires documents where it's false - so pausing via `registered` would quietly delete the account instead of hiding it. `paused` carries no TTL and no other meaning.
//
// Not in USER_FIELDS either, for the same reason createdAt isn't: that list feeds pickFields(req.body, USER_FIELDS) in the signup handler, so a field listed there can be set straight from a request body.
router.post("/account/pause", accountWriteRateLimit, requireAuth, async (req, res) => {
  const { paused } = req.body;
  // Strict rather than truthy: "false" and 0 are both things a client can send by accident, and silently reading either as a state change is worse than refusing it.
  if (typeof paused !== "boolean") {
    res.status(400).json({ error: "paused must be true or false." });
    return;
  }

  const db = await getDb();
  await db.collection("users").updateOne({ _id: req.user._id }, { $set: { paused } });

  res.json({ paused });
});

// Tighter than the write limiter: each call assembles every message the account has ever been part of, so this is the one route here whose cost scales with how much history someone has.
const exportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many export requests. Please try again later." },
});

// Everything this account owns, as one JSON file. No current-password check, unlike the routes above: this hands the session's owner data they can already read screen by screen in the app, so demanding a password would be friction without a corresponding risk.
router.get("/account/export", exportRateLimit, requireAuth, async (req, res) => {
  const { user } = req;
  const db = await getDb();

  const matches = await db
    .collection("matches")
    .find({ $or: [{ userA: user._id }, { userB: user._id }] })
    .toArray();
  const matchIds = matches.map((match) => match._id);

  // A thread's messages include what the other person wrote, which is the same thing Chat.jsx already shows - an export of a conversation that omitted half of it wouldn't be the conversation. Nothing here reaches into the other party's profile.
  const messages = await db.collection("messages").find({ matchId: { $in: matchIds } }).toArray();
  const swipes = await db
    .collection("swipes")
    .find({ $or: [{ fromUserId: user._id }, { toUserId: user._id }] })
    .toArray();

  // Destructured off rather than projected away at the query, because req.user is the document requireAuth already loaded - re-fetching it just to drop two fields would be a second round trip. `token` is the live session and `password` is the hash; neither belongs in a file that lands in someone's Downloads folder.
  const { password, token, ...account } = user;

  const filename = `debrief-data-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(JSON.stringify({ exportedAt: new Date().toISOString(), account, matches, messages, swipes }, null, 2));
});

// Irreversible, and scoped to the session's own account - there is no id in the request to get wrong. The current-password check is the same one the credential routes use, for a stronger version of the same reason: a browser someone walked away from shouldn't be able to erase the account.
router.delete("/account", credentialRateLimit, requireAuth, async (req, res) => {
  const { currentPassword } = req.body;

  const bad = await verifyCurrentPassword(req.user, currentPassword);
  if (bad) {
    res.status(bad.status).json(bad.body);
    return;
  }

  const db = await getDb();
  const result = await deleteUsersCompletely(db, [req.user]);

  // After the cascade, not before: closing first would leave a window where an open tab reconnects mid-delete and re-registers itself. Once the user document is gone, the token lookup in websocket.js's upgrade handler finds nothing and destroys the socket, so a reconnect can't succeed.
  closeConnectionsForUser(req.user._id);

  res.clearCookie("token");
  res.json(result);
});

module.exports = router;
