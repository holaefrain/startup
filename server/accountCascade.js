const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");

// The one place that knows everything a user owns. Extracted out of server/clearTestUsers.js so the dev cleanup script and DELETE /api/account run the identical cascade - two copies would drift the first time a collection is added, and the copy that got missed would be the one leaving records pointing at an id that no longer exists.
//
// Order matters: matches have to be read before they're deleted (their ids are what finds the messages), and the users themselves go last so a failure partway through leaves an account that can still be logged into and retried, rather than a live session pointing at a deleted document.

// S3 caps DeleteObjects at 1000 keys per call. One user can only hold 8 photos, but clearTestUsers.js passes every seed account at once, which clears that ceiling easily.
const S3_DELETE_BATCH = 1000;

function chunk(items, size) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

// Takes whole user documents rather than ids because photoKeys is the only way to find the S3 objects, and both callers already hold the documents - re-fetching them here would be a second round trip for data that's in hand.
async function deleteUsersCompletely(db, userDocs) {
  const userIds = userDocs.map((user) => user._id);
  if (userIds.length === 0) {
    return { users: 0, matches: 0, messages: 0, swipes: 0, photos: 0 };
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

  // TODO(step 6): reports and blocks join the cascade when those collections land - a block pointing at a deleted account would silently keep filtering nobody.

  const photoKeys = userDocs.flatMap((user) => user.photoKeys ?? []);
  for (const batch of chunk(photoKeys, S3_DELETE_BATCH)) {
    await s3Client.send(
      new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects: batch.map((Key) => ({ Key })) } })
    );
  }

  const users = await db.collection("users").deleteMany({ _id: { $in: userIds } });

  return {
    users: users.deletedCount,
    matches: matches.deletedCount,
    messages: messages.deletedCount,
    swipes: swipes.deletedCount,
    photos: photoKeys.length,
  };
}

module.exports = { deleteUsersCompletely };
