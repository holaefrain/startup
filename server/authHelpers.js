const { getDb } = require("./dbClient");

// The actual session lookup, independent of how the token was obtained - reused by getAuthenticatedUser below (req.cookies, the normal Express path) and server/websocket.js's upgrade handler, which has no req.cookies since cookie-parser never runs on a raw upgrade request.
async function getUserByToken(token) {
  if (!token) return null;
  const db = await getDb();
  return db.collection("users").findOne({ token });
}

// Shared by any route that needs to know who's making the request (not just the auth routes themselves) - looks up the `users` doc matching the session cookie's token, same lookup GET /api/user/me does.
async function getAuthenticatedUser(req) {
  return getUserByToken(req.cookies?.token);
}

module.exports = { getAuthenticatedUser, getUserByToken };
