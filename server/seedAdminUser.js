const { getDb, client } = require("./dbClient");

// Seeds a single admin@gmail.com profile directly into Mongo (not through
// POST /api/signup) - there's no login flow yet to authenticate this
// account against, so this just gets a record into the `users` collection
// for local testing. Password is deliberately not stored: see the note in
// userSchema.js - this codebase never persists plaintext passwords, and
// there's no auth endpoint yet to check one against anyway.

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
  const db = await getDb();
  await db.collection("users").updateOne(
    { email: ADMIN_PROFILE.email },
    { $set: ADMIN_PROFILE },
    { upsert: true }
  );
  console.log(`Seeded admin user (${ADMIN_PROFILE.email}).`);
  await client.close();
}

main().catch((error) => {
  console.error("Seeding admin user failed:", error.message);
  process.exit(1);
});
