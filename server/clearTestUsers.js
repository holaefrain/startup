const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");
const { getDb, client } = require("./dbClient");

// Matches on isSeed: true (the marker server/seedTestUsers.js sets) with the @example.com email pattern kept as a secondary safety net, so this never touches a real user even if isSeed somehow wasn't set. Cascades through swipes, matches, and messages before deleting the users themselves and their S3 photos - matches/messages didn't exist when this script was first written, so a plain user-only delete would otherwise leave those collections with records pointing at ids that no longer exist (including a real demo account's own matches with seed users, and any messages it sent into those threads).
const TEST_EMAIL_PATTERN = /@example\.com$/;

async function main() {
  const db = await getDb();
  const users = db.collection("users");

  const seedUsers = await users.find({ $or: [{ isSeed: true }, { email: TEST_EMAIL_PATTERN }] }).toArray();
  if (seedUsers.length === 0) {
    console.log("No seed users found - nothing to clean up.");
    await client.close();
    return;
  }
  const seedUserIds = seedUsers.map((user) => user._id);

  const affectedMatches = await db
    .collection("matches")
    .find({ $or: [{ userA: { $in: seedUserIds } }, { userB: { $in: seedUserIds } }] })
    .toArray();
  const affectedMatchIds = affectedMatches.map((match) => match._id);

  const messagesResult = await db.collection("messages").deleteMany({ matchId: { $in: affectedMatchIds } });
  const matchesResult = await db.collection("matches").deleteMany({ _id: { $in: affectedMatchIds } });
  const swipesResult = await db
    .collection("swipes")
    .deleteMany({ $or: [{ fromUserId: { $in: seedUserIds } }, { toUserId: { $in: seedUserIds } }] });

  const photoKeys = seedUsers.flatMap((user) => user.photoKeys || []);
  if (photoKeys.length > 0) {
    await s3Client.send(
      new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects: photoKeys.map((Key) => ({ Key })) } })
    );
  }

  const usersResult = await users.deleteMany({ _id: { $in: seedUserIds } });

  console.log(
    `Deleted ${usersResult.deletedCount} seed user(s), ${matchesResult.deletedCount} match(es), ` +
      `${messagesResult.deletedCount} message(s), ${swipesResult.deletedCount} swipe(s), and ${photoKeys.length} S3 photo(s).`
  );
  await client.close();
}

main().catch((error) => {
  console.error("Clearing test users failed:", error.message);
  process.exit(1);
});
