const { ObjectId } = require("mongodb");
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

// Validates a matchId and confirms `user` is one of the match's two participants. Returns { status, error } on any failure rather than writing a response itself, so it's usable both from the middleware below and directly inside a route where a match is only sometimes required - GET /api/venues needs it for scope=them but not for scope=me.
async function loadMatchMembership(user, matchId) {
  if (!ObjectId.isValid(matchId)) return { status: 400, error: "Invalid matchId." };

  const db = await getDb();
  const match = await db.collection("matches").findOne({ _id: new ObjectId(matchId) });
  if (!match) return { status: 404, error: "Match not found." };

  const isMember = match.userA.equals(user._id) || match.userB.equals(user._id);
  if (!isMember) return { status: 403, error: "You are not part of this match." };

  return { match, otherUserId: match.userA.equals(user._id) ? match.userB : match.userA };
}

// Middleware form, for routes whose whole purpose is scoped to one match - populates req.user/req.match/req.otherUserId the way server/chat.js's routes expect.
async function requireMatchMembership(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  const result = await loadMatchMembership(user, req.params.matchId);
  if (result.error) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  req.user = user;
  req.match = result.match;
  req.otherUserId = result.otherUserId;
  next();
}

module.exports = { getAuthenticatedUser, getUserByToken, loadMatchMembership, requireMatchMembership };
