const express = require("express");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { PUBLIC_QUERY_PROJECTION, projectVisibleFields } = require("./userSchema");
const { blockedUserIds } = require("./blocks");
const { resetSeedMatchesForUser } = require("./seedMatches");

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
  // Blocks join the same exclusion list rather than getting their own filter clause - to this query they mean the same thing swipes do ("never show me this person"), and both directions count, so being blocked hides you from them as surely as blocking hides them from you.
  const blockedIds = await blockedUserIds(db, currentUser._id);
  // Demo mode (?mode=demo) shows only the seeded fixture profiles - all of them stay swipeable (no pre-made matches) so liking one is a genuine, demoable swipe-to-match moment; anything else (including no param) is production mode, where real users never see seed profiles.
  const seedFilter = req.query.mode === "demo" ? { isSeed: true } : { isSeed: { $ne: true } };
  const profiles = await db
    .collection("users")
    .find(
      // `paused` is $ne: true rather than false so the vast majority of accounts - which predate the field and have no such key at all - still match. `registered` stays exactly as it was: it gates bare signups and backs the bare_profile_ttl index, so pausing was never safe to express through it (see server/account.js).
      {
        _id: { $nin: [...swipedIds, ...blockedIds, currentUser._id] },
        registered: true,
        paused: { $ne: true },
        ...seedFilter,
      },
      { projection: PUBLIC_QUERY_PROJECTION }
    )
    .toArray();

  res.json(profiles.map((profile) => ({ id: profile._id.toString(), ...projectVisibleFields(profile) })));
});

// Powers the "Reset Demo Mode" button in Discover.jsx - clears the current user's swipes/matches/messages with seed users specifically, so demo mode can be retested from a clean slate without touching any real relationships.
router.post("/discover/reset-demo", async (req, res) => {
  const currentUser = await getAuthenticatedUser(req);
  if (!currentUser) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  const db = await getDb();
  const result = await resetSeedMatchesForUser(db, currentUser._id);
  res.json(result);
});

module.exports = router;
