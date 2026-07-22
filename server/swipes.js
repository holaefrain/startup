const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");

const router = express.Router();

const VALID_ACTIONS = ["like", "pass"];

// Always returns [userA, userB] in the same order regardless of which id is passed first - both the match-existence lookup and the match-creation insert below must use this, since a plain unique index on (userA, userB) doesn't canonicalize a swapped pair for us (verified directly against the collection before writing this endpoint - see the matches collection setup).
function canonicalPair(id1, id2) {
  return id1.toHexString() < id2.toHexString() ? [id1, id2] : [id2, id1];
}

// Creates (or returns the existing) match between two users - canonicalizes the pair first, race-safe via the E11000 catch if a concurrent request creates the same match between the existence check and the insert. Shared by the real mutual-like path below and server/seedMatches.js, so there's exactly one implementation of "how a match gets created."
async function ensureMatch(matches, id1, id2) {
  const [userA, userB] = canonicalPair(id1, id2);
  const existing = await matches.findOne({ userA, userB });
  if (existing) return existing._id;

  try {
    const result = await matches.insertOne({ userA, userB, createdAt: new Date() });
    return result.insertedId;
  } catch (err) {
    if (err.code === 11000) {
      const raceMatch = await matches.findOne({ userA, userB });
      return raceMatch?._id;
    }
    throw err;
  }
}

router.post("/swipes", async (req, res) => {
  const currentUser = await getAuthenticatedUser(req);
  if (!currentUser) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  const { toUserId, action } = req.body;
  if (!VALID_ACTIONS.includes(action)) {
    res.status(400).json({ error: "action must be 'like' or 'pass'." });
    return;
  }
  if (typeof toUserId !== "string" || !ObjectId.isValid(toUserId)) {
    res.status(400).json({ error: "Invalid toUserId." });
    return;
  }

  const targetId = new ObjectId(toUserId);
  if (targetId.equals(currentUser._id)) {
    res.status(400).json({ error: "Cannot swipe on yourself." });
    return;
  }

  const db = await getDb();
  const users = db.collection("users");
  const swipes = db.collection("swipes");
  const matches = db.collection("matches");

  // registered: true excludes bare/incomplete signups - same rule server/discover.js's feed uses, so a swipe can never be recorded against a profile that could never show up (or log in to chat back) in the first place.
  const targetUser = await users.findOne({ _id: targetId, registered: true }, { projection: { _id: 1 } });
  if (!targetUser) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  await swipes.updateOne(
    { fromUserId: currentUser._id, toUserId: targetId },
    { $set: { fromUserId: currentUser._id, toUserId: targetId, action, createdAt: new Date() } },
    { upsert: true }
  );

  if (action !== "like") {
    res.json({ matched: false });
    return;
  }

  const reverseSwipe = await swipes.findOne({ fromUserId: targetId, toUserId: currentUser._id });
  if (reverseSwipe?.action !== "like") {
    res.json({ matched: false });
    return;
  }

  const matchId = await ensureMatch(matches, currentUser._id, targetId);
  res.json({ matched: true, matchId: matchId.toString() });
});

router.canonicalPair = canonicalPair;
router.ensureMatch = ensureMatch;

module.exports = router;
