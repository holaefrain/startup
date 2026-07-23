const { getDb, client } = require("./dbClient");
const { ensureMatch } = require("./swipes");

const DEFAULT_MATCH_COUNT = 5;

// Ensures `targetUserId` has matches (plus the swipes that would have produced them, so Discover's exclusion filter behaves correctly) with up to `count` of the isSeed:true demo profiles - idempotent, safe to call repeatedly. Callers are responsible for not invoking this with a seed user's own id (matching seed users with each other isn't a meaningful operation). Resolves to an empty array if no seed users exist yet - callers decide whether that's worth surfacing.
async function ensureSeedMatchesForUser(db, targetUserId, count = DEFAULT_MATCH_COUNT) {
  const users = db.collection("users");
  const swipes = db.collection("swipes");
  const matches = db.collection("matches");

  // Sorted by _id (roughly chronological) so "first N" is deterministic across calls.
  const seedUsers = await users.find({ isSeed: true, registered: true }).sort({ _id: 1 }).limit(count).toArray();

  const results = [];
  for (const seedUser of seedUsers) {
    if (seedUser._id.equals(targetUserId)) continue;

    const now = new Date();
    await swipes.updateOne(
      { fromUserId: targetUserId, toUserId: seedUser._id },
      { $set: { fromUserId: targetUserId, toUserId: seedUser._id, action: "like", createdAt: now } },
      { upsert: true }
    );
    await swipes.updateOne(
      { fromUserId: seedUser._id, toUserId: targetUserId },
      { $set: { fromUserId: seedUser._id, toUserId: targetUserId, action: "like", createdAt: now } },
      { upsert: true }
    );

    const matchId = await ensureMatch(matches, targetUserId, seedUser._id);
    results.push({ seedUser, matchId });
  }

  return results;
}

// CLI entry point - resolves SEED_MATCH_EMAIL to a user, then delegates to ensureSeedMatchesForUser. Guarded by require.main below so requiring this file as a module (e.g. from server/discover.js) never triggers this to run.
async function main() {
  const targetEmail = process.env.SEED_MATCH_EMAIL;
  const matchCount = Number(process.env.SEED_MATCH_COUNT) || DEFAULT_MATCH_COUNT;

  if (!targetEmail) {
    throw new Error("SEED_MATCH_EMAIL is required, e.g. SEED_MATCH_EMAIL=you@example.com npm run seed:matches");
  }

  const db = await getDb();
  const targetUser = await db.collection("users").findOne({ email: targetEmail });
  if (!targetUser) {
    throw new Error(`No user found with email ${targetEmail}. Sign up (and register) first.`);
  }
  if (!targetUser.registered) {
    throw new Error(`${targetEmail} isn't a registered account yet.`);
  }
  if (targetUser.isSeed) {
    throw new Error(`${targetEmail} is itself a seed user - matching seed users with each other isn't supported.`);
  }

  const results = await ensureSeedMatchesForUser(db, targetUser._id, matchCount);
  if (results.length === 0) {
    console.log("No seed users found - run `npm run seed:users` first.");
  } else {
    for (const { seedUser, matchId } of results) {
      console.log(`Matched ${targetUser.email} with ${seedUser.first_name} ${seedUser.last_name} -> match ${matchId}`);
    }
    console.log(`Done. ${results.length} seed match(es) ready for ${targetUser.email}.`);
  }
  await client.close();
}

module.exports = { ensureSeedMatchesForUser };

if (require.main === module) {
  main().catch((error) => {
    console.error("Seeding matches failed:", error.message);
    process.exit(1);
  });
}
