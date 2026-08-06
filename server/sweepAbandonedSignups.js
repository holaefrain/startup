const { getDb, client } = require("./dbClient");
const { deleteUsersCompletely } = require("./accountCascade");

// POST /api/signup writes a bare profile and its photos, and POST /api/auth turns that into a real account moments later. A signup abandoned in between leaves the document to bare_profile_ttl - but a TTL index only removes the document, and MongoDB has no idea the photoKeys inside it name objects in S3. Those objects then sit in the bucket permanently with nothing left that could ever reference them, which is a bill that only grows.
//
// This sweeps the same documents the TTL would, but through deleteUsersCompletely, which already knows how to remove the S3 objects along with everything else the account owns.
//
// GRACE_MINUTES is deliberately well under the TTL's own hour: whichever of the two reaches a document first is the one that decides whether its photos get cleaned up, so the sweep has to win under normal operation. That leaves the TTL as a genuine backstop rather than a competitor - if this job stops running, documents still expire on their own, just with the photo leak this exists to prevent. No index change is needed to arrange that, only a grace period smaller than the TTL's.
const GRACE_MINUTES = 30;

// Matches bare_profile_ttl's own partial filter (`registered` exactly false) so this sweeps precisely the set the TTL would, and never a document the TTL wouldn't have touched.
//
// The password guard has no counterpart in the TTL, and is the one place this is deliberately stricter: `registered: false` alongside a set password is a state the app never writes, so if one ever appears it's damage rather than an abandoned signup, and the TTL would delete a credentialed account without hesitating. Leaving it alone costs a stale document; deleting it costs somebody their account.
function abandonedFilter(cutoff) {
  return { registered: false, password: { $exists: false }, createdAt: { $lt: cutoff } };
}

async function sweepAbandonedSignups(db, { graceMinutes = GRACE_MINUTES, dryRun = false } = {}) {
  const cutoff = new Date(Date.now() - graceMinutes * 60 * 1000);
  const abandoned = await db.collection("users").find(abandonedFilter(cutoff)).toArray();

  if (abandoned.length === 0) {
    return { swept: 0, photos: 0, dryRun };
  }

  const photos = abandoned.reduce((total, user) => total + (user.photoKeys?.length ?? 0), 0);
  if (dryRun) {
    return { swept: abandoned.length, photos, dryRun: true, candidates: abandoned.map((user) => user._id.toString()) };
  }

  const result = await deleteUsersCompletely(db, abandoned);
  return { swept: result.users, photos: result.photos, dryRun: false };
}

// Intended to run on a schedule - e.g. `pm2 start server/sweepAbandonedSignups.js --name sweep --cron "*/10 * * * *" --no-autorestart` - at any interval shorter than the grace period above. Running it more often than necessary is harmless: a sweep with nothing to do is one indexed query.
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = await getDb();
  const result = await sweepAbandonedSignups(db, { dryRun });

  if (result.swept === 0) {
    console.log("Nothing to sweep - no abandoned signups past the grace period.");
  } else if (result.dryRun) {
    console.log(`[dry run] would delete ${result.swept} abandoned signup(s) and ${result.photos} photo(s).`);
    for (const id of result.candidates) console.log(`  ${id}`);
  } else {
    console.log(`Swept ${result.swept} abandoned signup(s) and ${result.photos} photo(s).`);
  }

  await client.close();
}

module.exports = { sweepAbandonedSignups, abandonedFilter, GRACE_MINUTES };

if (require.main === module) {
  main().catch((error) => {
    console.error("Sweeping abandoned signups failed:", error.message);
    process.exit(1);
  });
}
