const express = require("express");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { PUBLIC_QUERY_PROJECTION, projectVisibleFields } = require("./userSchema");

const router = express.Router();

router.get("/discover", async (req, res) => {
  const currentUser = await getAuthenticatedUser(req);
  if (!currentUser) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  const db = await getDb();
  // Already-swiped profiles (liked, passed, or matched) shouldn't reappear, and bare/incomplete signups (Phase 1's registered flag) shouldn't show up as swipeable people in the first place.
  const swipedIds = await db.collection("swipes").distinct("toUserId", { fromUserId: currentUser._id });
  const profiles = await db
    .collection("users")
    .find(
      { _id: { $nin: [...swipedIds, currentUser._id] }, registered: true },
      { projection: PUBLIC_QUERY_PROJECTION }
    )
    .toArray();

  res.json(profiles.map((profile) => ({ id: profile._id.toString(), ...projectVisibleFields(profile) })));
});

module.exports = router;
