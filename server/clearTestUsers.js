const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");
const { getDb, client } = require("./dbClient");

// Removes the fake profiles created by seedTestUsers.js, along with their
// S3 photos - otherwise those objects would be orphaned in the bucket.
// Matches on the @example.com emails those profiles use, so it never
// touches a real user.
const TEST_EMAIL_PATTERN = /@example\.com$/;

async function main() {
  const db = await getDb();
  const testUsers = await db
    .collection("users")
    .find({ email: TEST_EMAIL_PATTERN })
    .toArray();

  const photoKeys = testUsers.flatMap((user) => user.photoKeys || []);
  await Promise.all(
    photoKeys.map((Key) => s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key })))
  );

  const result = await db.collection("users").deleteMany({ email: TEST_EMAIL_PATTERN });
  console.log(`Deleted ${result.deletedCount} test user(s) and ${photoKeys.length} S3 photo(s).`);
  await client.close();
}

main().catch((error) => {
  console.error("Clearing test users failed:", error.message);
  process.exit(1);
});
