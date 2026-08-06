const { getDb } = require("./dbClient");

// A block is stored once, from the person who pressed the button, but it takes effect in both directions: the blocker stops seeing the blocked account and the blocked account stops seeing the blocker. Storing one row and reading it symmetrically is what keeps "did A block B, or B block A?" from ever mattering at a call site - no query anywhere should have to know which way round it was.
//
// Shape: { blockerId, blockedId, createdAt }. Kept in its own module rather than in server/safety.js because the three places that *enforce* a block (discover.js, chat.js, authHelpers.js) have no other reason to load the routes that create one.

// Every id this user can't see and that can't see them, in one query. Returns ObjectIds, ready to drop straight into a $nin.
async function blockedUserIds(db, userId) {
  const rows = await db
    .collection("blocks")
    .find({ $or: [{ blockerId: userId }, { blockedId: userId }] }, { projection: { blockerId: 1, blockedId: 1 } })
    .toArray();

  return rows.map((row) => (row.blockerId.equals(userId) ? row.blockedId : row.blockerId));
}

// The pair form, for a route that already knows both ids and only needs a yes/no - cheaper than pulling the whole list to check one membership.
async function isBlockedPair(db, firstId, secondId) {
  const existing = await db.collection("blocks").findOne({
    $or: [
      { blockerId: firstId, blockedId: secondId },
      { blockerId: secondId, blockedId: firstId },
    ],
  });
  return !!existing;
}

// Idempotent on purpose: pressing block twice - or blocking someone who already blocked you - is not an error, and an upsert means correctness doesn't depend on the unique index existing (see server/createSafetyIndexes.js, which the deployed database has to be given separately).
async function createBlock(db, blockerId, blockedId) {
  await db
    .collection("blocks")
    .updateOne(
      { blockerId, blockedId },
      { $setOnInsert: { blockerId, blockedId, createdAt: new Date() } },
      { upsert: true }
    );
}

// Only removes the row this user created. Unblocking cannot lift a block the *other* person placed - if it could, the button would quietly undo somebody else's decision about their own safety.
async function removeBlock(db, blockerId, blockedId) {
  const result = await db.collection("blocks").deleteOne({ blockerId, blockedId });
  return result.deletedCount > 0;
}

module.exports = { blockedUserIds, isBlockedPair, createBlock, removeBlock };
