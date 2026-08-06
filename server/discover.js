const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { PUBLIC_QUERY_PROJECTION, projectVisibleFields } = require("./userSchema");
const { blockedUserIds } = require("./blocks");
const { resetSeedMatchesForUser } = require("./seedMatches");

const router = express.Router();

// This endpoint used to return every swipeable account in one response. That's a card stack nobody swipes to the end of, and it also meant a single request handed over the entire membership of the app - names, photos and every visible profile field - which is worth far more to someone scraping than it is to the person swiping.
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

router.get("/discover", async (req, res) => {
  const currentUser = await getAuthenticatedUser(req);
  if (!currentUser) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  // Clamped rather than trusted: `limit` is the one number a client picks that decides how much work this query does, so an absent, junk, negative or enormous value all resolve to something sane instead of to whatever was asked for.
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  // Keyset pagination on _id rather than skip/offset. The exclusion list below grows every time the caller swipes, so the result set shifts underneath them between requests - an offset would then skip profiles or repeat them, while "everything after this id" stays correct no matter how much the set changed in between.
  const after = req.query.after;
  if (after !== undefined && (typeof after !== "string" || !ObjectId.isValid(after))) {
    res.status(400).json({ error: "Invalid cursor." });
    return;
  }

  const db = await getDb();
  // Already-swiped profiles (liked, passed, or matched) shouldn't reappear, and bare/incomplete signups (Phase 1's registered flag) shouldn't show up as swipeable people in the first place.
  const swipedIds = await db.collection("swipes").distinct("toUserId", { fromUserId: currentUser._id });
  // Blocks join the same exclusion list rather than getting their own filter clause - to this query they mean the same thing swipes do ("never show me this person"), and both directions count, so being blocked hides you from them as surely as blocking hides them from you.
  const blockedIds = await blockedUserIds(db, currentUser._id);
  // Demo mode (?mode=demo) shows only the seeded fixture profiles - all of them stay swipeable (no pre-made matches) so liking one is a genuine, demoable swipe-to-match moment; anything else (including no param) is production mode, where real users never see seed profiles.
  const seedFilter = req.query.mode === "demo" ? { isSeed: true } : { isSeed: { $ne: true } };
  // $nin and $gt combine on the same field: the exclusion list and the cursor are both constraints on _id, so they belong in one operator object rather than two clauses.
  const idFilter = { $nin: [...swipedIds, ...blockedIds, currentUser._id] };
  if (after) idFilter.$gt = new ObjectId(after);

  const profiles = await db
    .collection("users")
    .find(
      // `paused` is $ne: true rather than false so the vast majority of accounts - which predate the field and have no such key at all - still match. `registered` stays exactly as it was: it gates bare signups and backs the bare_profile_ttl index, so pausing was never safe to express through it (see server/account.js).
      {
        _id: idFilter,
        registered: true,
        paused: { $ne: true },
        ...seedFilter,
      },
      { projection: PUBLIC_QUERY_PROJECTION }
    )
    // The sort is what makes the cursor mean anything - without a total order, "everything after this id" isn't a well-defined position in the result set. Ascending _id is roughly oldest-account-first, which is a change from the arbitrary natural order this returned before.
    .sort({ _id: 1 })
    .limit(limit)
    .toArray();

  // A full page implies there may be more; a short one is the end. This does mean the final page occasionally hands back a cursor that turns out to have nothing behind it, which costs one empty request rather than a count query on every single call.
  const nextCursor = profiles.length === limit ? profiles[profiles.length - 1]._id.toString() : null;

  res.json({
    profiles: profiles.map((profile) => ({ id: profile._id.toString(), ...projectVisibleFields(profile) })),
    nextCursor,
  });
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
