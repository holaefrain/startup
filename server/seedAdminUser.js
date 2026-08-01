const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getDb, client } = require("./dbClient");

// Seeds a single admin@gmail.com account directly into Mongo (not through
// POST /api/signup + POST /api/auth), for local testing.
//
// This deliberately stored no password back when there was no login endpoint
// to check one against. server/auth.js has one now, and PUT /api/auth rejects
// any account whose `password` is unset - so a credential-less admin could
// never actually log in. It now writes the same three fields a real
// registration does (bcrypt hash, session token, registered: true), so the
// seeded account behaves exactly like one created through the real flow.
//
// The password itself comes from ADMIN_PASSWORD in .env, which is gitignored -
// this file is committed, so it must never hold the value itself.

const ADMIN_PROFILE = {
  first_name: "Admin",
  last_name: "User",
  email: "admin@gmail.com",
  phone: "+18015550000",
  pronouns: "they_them",
  gender: "other",
  age: 30,
  photoKeys: [],
  createdAt: new Date(),
};

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not set. Add it to .env, then re-run `npm run seed:admin`.");
  }

  const db = await getDb();
  // Service Deilverable: Uses BCrypt to hash passwords
  const passwordHash = await bcrypt.hash(password, 10);

  await db.collection("users").updateOne(
    { email: ADMIN_PROFILE.email },
    // DB Deilverable: Stores credentials in MongoDB
    { $set: { ...ADMIN_PROFILE, password: passwordHash, token: uuidv4(), registered: true } },
    { upsert: true }
  );

  console.log(`Seeded admin user (${ADMIN_PROFILE.email}) with credentials from ADMIN_PASSWORD.`);
  await client.close();
}

main().catch((error) => {
  console.error("Seeding admin user failed:", error.message);
  process.exit(1);
});
