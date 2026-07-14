const express = require("express");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");

// Basic-info-only projection: no email, phone, password, or token - this
// feed is visible to any other logged-in user, not just the profile owner.
const DISCOVER_PROJECTION = {
  first_name: 1,
  last_name: 1,
  age: 1,
  location: 1,
  hometown: 1,
  job_title: 1,
  photoKeys: 1,
};

const router = express.Router();

router.get("/discover", async (req, res) => {
  const currentUser = await getAuthenticatedUser(req);
  if (!currentUser) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  const db = await getDb();
  const profiles = await db
    .collection("users")
    .find({ _id: { $ne: currentUser._id } }, { projection: DISCOVER_PROJECTION })
    .toArray();

  res.json(profiles.map(({ _id, ...profile }) => ({ id: _id.toString(), ...profile })));
});

module.exports = router;
