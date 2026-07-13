const { getDb, client } = require("./dbClient");

async function main() {
  const db = await getDb();
  await db.command({ ping: 1 });
  console.log(`Connected to MongoDB database "${db.databaseName}" successfully.`);
  await client.close();
}

main().catch((error) => {
  console.error("Could not reach MongoDB:", error.message);
  process.exit(1);
});
