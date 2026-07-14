const { getDb } = require("./dbClient");

// Shared by any route that needs to know who's making the request (not
// just the auth routes themselves) - looks up the `users` doc matching the
// session cookie's token, same lookup GET /api/user/me does.
async function getAuthenticatedUser(req) {
  const token = req.cookies?.token;
  if (!token) return null;
  const db = await getDb();
  return db.collection("users").findOne({ token });
}

module.exports = { getAuthenticatedUser };
