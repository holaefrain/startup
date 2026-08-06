const { deletePhotoObjects } = require("./photoStorage");

// The one place that knows everything a user owns. Extracted out of server/clearTestUsers.js so the dev cleanup script and DELETE /api/account run the identical cascade - two copies would drift the first time a collection is added, and the copy that got missed would be the one leaving records pointing at an id that no longer exists.
//
// Order matters: matches have to be read before they're deleted (their ids are what finds the messages), and the users themselves go last so a failure partway through leaves an account that can still be logged into and retried, rather than a live session pointing at a deleted document.

// Takes whole user documents rather than ids because photoKeys is the only way to find the S3 objects, and both callers already hold the documents - re-fetching them here would be a second round trip for data that's in hand.
async function deleteUsersCompletely(db, userDocs) {
  const userIds = userDocs.map((user) => user._id);
  if (userIds.length === 0) {
    return { users: 0, matches: 0, messages: 0, swipes: 0, blocks: 0, reports: 0, photos: 0 };
  }

  const affectedMatches = await db
    .collection("matches")
    .find({ $or: [{ userA: { $in: userIds } }, { userB: { $in: userIds } }] }, { projection: { _id: 1 } })
    .toArray();
  const affectedMatchIds = affectedMatches.map((match) => match._id);

  const messages = await db.collection("messages").deleteMany({ matchId: { $in: affectedMatchIds } });
  const matches = await db.collection("matches").deleteMany({ _id: { $in: affectedMatchIds } });
  const swipes = await db
    .collection("swipes")
    .deleteMany({ $or: [{ fromUserId: { $in: userIds } }, { toUserId: { $in: userIds } }] });

  // Blocks go in both directions: a row pointing at an account that no longer exists filters nobody and can never be lifted from the Settings list, so it's pure garbage either way round.
  const blocks = await db
    .collection("blocks")
    .deleteMany({ $or: [{ blockerId: { $in: userIds } }, { blockedId: { $in: userIds } }] });

  // Reports are deliberately asymmetric. Ones *about* a deleted account go, because there's no longer an account to action. Ones *filed by* it stay: they concern accounts that may still be active and may still need review, and a reviewer's queue emptying itself because the reporter left is how repeat behaviour goes unnoticed.
  const reports = await db.collection("reports").deleteMany({ reportedUserId: { $in: userIds } });

  // Batching and best-effort behaviour both live in the shared helper - clearTestUsers.js passes every seed account at once, which clears S3's 1000-key ceiling easily.
  const photoKeys = userDocs.flatMap((user) => user.photoKeys ?? []);
  await deletePhotoObjects(photoKeys);

  const users = await db.collection("users").deleteMany({ _id: { $in: userIds } });

  return {
    users: users.deletedCount,
    matches: matches.deletedCount,
    messages: messages.deletedCount,
    swipes: swipes.deletedCount,
    blocks: blocks.deletedCount,
    reports: reports.deletedCount,
    photos: photoKeys.length,
  };
}

module.exports = { deleteUsersCompletely };
