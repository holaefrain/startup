const express = require("express");
const rateLimit = require("express-rate-limit");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");

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

module.exports = router;
