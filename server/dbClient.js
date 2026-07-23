const { MongoClient } = require("mongodb");
const dbConfig = require("./dbConfig.json");

const url = `mongodb+srv://${dbConfig.userName}:${encodeURIComponent(dbConfig.password)}@${dbConfig.hostname}`;

// Single-instance class project with low, unpredictable traffic, so this
// relies on the driver's default pool size (100) instead of guessing a
// custom value. serverSelectionTimeoutMS is shortened so a misconfigured
// connection fails fast during development instead of hanging.
const client = new MongoClient(url, {
  serverSelectionTimeoutMS: 5000,
});

// Assumes a "debrief" database (matches the app name in architecture.md).
// Connects once and reuses the same client/db across the app.
let connectPromise = null;
function getDb() {
  if (!connectPromise) {
    connectPromise = client.connect().then(() => client.db("debrief"));
  }
  return connectPromise;
}

module.exports = { getDb, client };
