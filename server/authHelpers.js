const { ObjectId } = require("mongodb");
const { getDb } = require("./dbClient");
const { isBlockedPair } = require("./blocks");

// The actual session lookup, independent of how the token was obtained - reused by getAuthenticatedUser below (req.cookies, the normal Express path) and server/websocket.js's upgrade handler, which has no req.cookies since cookie-parser never runs on a raw upgrade request.
// The type check is the security boundary, not a nicety: cookie-parser JSON-decodes any cookie value starting with "j:" whether or not a signing secret is configured, so `token` arrives attacker-controlled in type as well as value. A truthiness check passes an object straight through, and `{ token: { $gt: "" } }` is then a Mongo operator that matches the first user holding any session - authenticating as a real user with no credentials at all. Enforced here rather than at each call site because this is the one lookup every authenticated route reaches, Express and WebSocket alike.
async function getUserByToken(token) {
  if (typeof token !== "string" || token.length === 0) return null;
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

  const otherUserId = match.userA.equals(user._id) ? match.userB : match.userA;

  // Every match-scoped route funnels through here - reading a thread, sending into it, marking it read, accepting a date, and GET /api/venues?scope=them - so one check closes all of them at once. Enforced at the membership layer rather than per route precisely because a route added later would otherwise have to remember to repeat it.
  // Symmetric: it doesn't matter which side pressed block. The thread stops existing for both, which is also why GET /api/matches drops it from the list rather than showing a conversation that 403s when opened.
  if (await isBlockedPair(db, user._id, otherUserId)) {
    return { status: 403, error: "This conversation is no longer available." };
  }

  return { match, otherUserId };
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
