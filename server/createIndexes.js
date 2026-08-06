const { getDb, client } = require("./dbClient");

// The `blocks` and `reports` collections are the first this codebase creates indexes for in code - the users collection's four (email_unique_registered, phone_unique_registered, bare_profile_ttl, _id_) were built by hand against the deployed database, so there was no setup script to extend. Run once per environment: `npm run indexes:safety`.
//
// createIndex is idempotent, so re-running is safe and is the intended way to apply this to a database that already has some of them.

async function main() {
  const db = await getDb();

  // One row per direction per pair. createBlock upserts on exactly this key, so the app stays correct without the index - but the index is what stops two concurrent presses from racing a duplicate in between the upsert's find and its insert.
  await db.collection("blocks").createIndex({ blockerId: 1, blockedId: 1 }, { unique: true, name: "block_pair_unique" });

  // blockedUserIds() reads a pair of $or branches, one per direction; the compound index above already serves the blockerId branch, and this serves the other.
  await db.collection("blocks").createIndex({ blockedId: 1 }, { name: "block_by_blocked" });

  // The review queue README.md describes: open reports, oldest first.
  await db.collection("reports").createIndex({ status: 1, createdAt: 1 }, { name: "report_queue" });

  // What the delete cascade filters on when an account goes (server/accountCascade.js).
  await db.collection("reports").createIndex({ reportedUserId: 1 }, { name: "report_by_reported" });

  for (const name of ["blocks", "reports"]) {
    const indexes = await db.collection(name).indexes();
    console.log(`${name}: ${indexes.map((index) => index.name).join(", ")}`);
  }

  await client.close();
}

main().catch((error) => {
  console.error("Creating safety indexes failed:", error.message);
  process.exit(1);
});
