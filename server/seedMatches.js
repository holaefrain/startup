const { getDb, client } = require("./dbClient");
const { ensureMatch } = require("./swipes");

// Creates pre-seeded matches (plus the swipes records that would have produced them, so Discover's exclusion filter behaves correctly) between a real target account and a subset of the isSeed:true demo profiles - for demo purposes. Requires `npm run seed:users` to have already run. Idempotent: both the swipes upserts and ensureMatch are safe to re-run.

const TARGET_EMAIL = process.env.SEED_MATCH_EMAIL;
const MATCH_COUNT = Number(process.env.SEED_MATCH_COUNT) || 5;

async function main() {
  if (!TARGET_EMAIL) {
    throw new Error("SEED_MATCH_EMAIL is required, e.g. SEED_MATCH_EMAIL=you@example.com npm run seed:matches");
  }

  const db = await getDb();
  const users = db.collection("users");
  const swipes = db.collection("swipes");
  const matches = db.collection("matches");

  const targetUser = await users.findOne({ email: TARGET_EMAIL });
  if (!targetUser) {
    throw new Error(`No user found with email ${TARGET_EMAIL}. Sign up (and register) first.`);
  }
  if (!targetUser.registered) {
    throw new Error(`${TARGET_EMAIL} isn't a registered account yet.`);
  }

  // Sorted by _id (roughly chronological) so "first N" is deterministic across runs.
  const seedUsers = await users
    .find({ isSeed: true, registered: true })
    .sort({ _id: 1 })
    .limit(MATCH_COUNT)
    .toArray();

  if (seedUsers.length === 0) {
    throw new Error("No seed users found - run `npm run seed:users` first.");
  }

  for (const seedUser of seedUsers) {
    if (seedUser._id.equals(targetUser._id)) continue;

    const now = new Date();
    await swipes.updateOne(
      { fromUserId: targetUser._id, toUserId: seedUser._id },
      { $set: { fromUserId: targetUser._id, toUserId: seedUser._id, action: "like", createdAt: now } },
      { upsert: true }
    );
    await swipes.updateOne(
      { fromUserId: seedUser._id, toUserId: targetUser._id },
      { $set: { fromUserId: seedUser._id, toUserId: targetUser._id, action: "like", createdAt: now } },
      { upsert: true }
    );

    const matchId = await ensureMatch(matches, targetUser._id, seedUser._id);
    console.log(`Matched ${targetUser.email} with ${seedUser.first_name} ${seedUser.last_name} -> match ${matchId}`);
  }

  console.log(`Done. ${seedUsers.length} seed match(es) ready for ${TARGET_EMAIL}.`);
  await client.close();
}

main().catch((error) => {
  console.error("Seeding matches failed:", error.message);
  process.exit(1);
});
