const { getDb, client } = require("./dbClient");

// Every index this app creates in code. Run once per environment: `npm run indexes`.
//
// createIndex is idempotent, so re-running is safe and is the intended way to apply this to a database that already has some of them.
//
// The three users indexes below were originally built by hand against the deployed database and existed nowhere in this repo, which meant a fresh environment came up silently missing both unique constraints and the TTL. They're transcribed from the live cluster's own definitions, not reconstructed from what the code appears to want - createIndex only stays idempotent while the options match exactly, so a plausible-looking guess would fail with an options conflict at best and change expiry behaviour at worst.

async function main() {
  const db = await getDb();

  // Both of these are what actually enforce "one account per email/phone", and both are partial on `password` existing rather than plain unique - a bare profile from an interrupted signup has neither credential set yet, and several of those legitimately share an address until one of them registers. See server/auth.js, which relies on the resulting 11000 as its real duplicate guard rather than a read-then-write check that would race anyway.
  await db
    .collection("users")
    .createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { password: { $exists: true } }, name: "email_unique_registered" }
    );
  await db
    .collection("users")
    .createIndex(
      { phone: 1 },
      { unique: true, partialFilterExpression: { password: { $exists: true } }, name: "phone_unique_registered" }
    );

  // Expires abandoned bare profiles an hour after creation. The partial filter is what keeps it off real accounts: only documents where `registered` is exactly false are ever candidates, so flipping that flag at registration is what makes an account permanent. This is why server/account.js's pause switch is its own field instead of a reuse of `registered` - expressing "paused" through this flag would hand the account to this index an hour later.
  await db
    .collection("users")
    .createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 3600, partialFilterExpression: { registered: false }, name: "bare_profile_ttl" }
    );

  // Every authenticated request in the app resolves its session through findOne({ token }) in server/authHelpers.js, and without this that lookup is a full collection scan of `users` - so the cost of being logged in grows with the size of the user base, on literally every request. This is the one index whose absence is an availability problem rather than a slow query.
  //
  // Plain rather than unique: `token` is absent on bare profiles and is $unset by logout, so a unique index would collide across every document missing it. The partial index that would fix that is only *used* when the planner can prove a query is a subset of its filter, which is a subtlety worth avoiding on this of all paths - and uniqueness buys nothing here, since the values are server-generated uuidv4s, not anything a client picks.
  await db.collection("users").createIndex({ token: 1 }, { name: "user_by_token" });

  // One row per direction per pair. createBlock upserts on exactly this key, so the app stays correct without the index - but the index is what stops two concurrent presses from racing a duplicate in between the upsert's find and its insert.
  await db.collection("blocks").createIndex({ blockerId: 1, blockedId: 1 }, { unique: true, name: "block_pair_unique" });

  // blockedUserIds() reads a pair of $or branches, one per direction; the compound index above already serves the blockerId branch, and this serves the other.
  await db.collection("blocks").createIndex({ blockedId: 1 }, { name: "block_by_blocked" });

  // The review queue README.md describes: open reports, oldest first.
  await db.collection("reports").createIndex({ status: 1, createdAt: 1 }, { name: "report_queue" });

  // What the delete cascade filters on when an account goes (server/accountCascade.js).
  await db.collection("reports").createIndex({ reportedUserId: 1 }, { name: "report_by_reported" });

  for (const name of ["users", "blocks", "reports"]) {
    const indexes = await db.collection(name).indexes();
    console.log(`${name}: ${indexes.map((index) => index.name).join(", ")}`);
  }

  await client.close();
}

main().catch((error) => {
  console.error("Creating indexes failed:", error.message);
  process.exit(1);
});
