const { getDb, client } = require("./dbClient");
const { deleteUsersCompletely } = require("./accountCascade");

// Matches on isSeed: true (the marker server/seedTestUsers.js sets) with the @example.com email pattern kept as a secondary safety net, so this never touches a real user even if isSeed somehow wasn't set.
//
// The cascade itself now lives in server/accountCascade.js, shared with DELETE /api/account - this file's job is only deciding *which* users to remove, which is the one part the two callers don't agree on.
const TEST_EMAIL_PATTERN = /@example\.com$/;

async function main() {
  const db = await getDb();

  const seedUsers = await db
    .collection("users")
    .find({ $or: [{ isSeed: true }, { email: TEST_EMAIL_PATTERN }] })
    .toArray();

  if (seedUsers.length === 0) {
    console.log("No seed users found - nothing to clean up.");
    await client.close();
    return;
  }

  const result = await deleteUsersCompletely(db, seedUsers);

  console.log(
    `Deleted ${result.users} seed user(s), ${result.matches} match(es), ` +
      `${result.messages} message(s), ${result.swipes} swipe(s), and ${result.photos} S3 photo(s).`
  );
  await client.close();
}

main().catch((error) => {
  console.error("Clearing test users failed:", error.message);
  process.exit(1);
});
