const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");

// Credentials live on the same `users` document the signup wizard creates
// (matched by email) rather than a separate collection, so a profile
// created via POST /api/signup and credentials registered here end up as
// one document per person. Because of that, registration only 409s when
// the matched user already has a `password` set - a bare profile doc with
// no credentials yet (the normal case right after /api/signup) is fair
// game to register against.

const router = express.Router();

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  });
}

router.post("/auth", async (req, res) => {
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
  await users.updateOne(
    { email },
    { $set: { email, password: passwordHash, token }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );

  setAuthCookie(res, token);
  res.json({ email });
});

router.put("/auth", async (req, res) => {
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

router.get("/user/me", async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  res.json({ email: user.email });
});

module.exports = router;
