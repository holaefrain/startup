const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { PUBLIC_QUERY_PROJECTION, projectVisibleFields } = require("./userSchema");
const { broadcastToUsers } = require("./websocket");

const MAX_MESSAGE_LENGTH = 2000;

const router = express.Router();

// Plain session check, for the one route below that isn't scoped to a specific match.
async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}

// Shared by both matchId-scoped routes below - validates the id shape, loads the match, and confirms the authenticated user is actually one of its two participants before letting the request through.
async function requireMatchMembership(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  const { matchId } = req.params;
  if (!ObjectId.isValid(matchId)) {
    res.status(400).json({ error: "Invalid matchId." });
    return;
  }

  const db = await getDb();
  const match = await db.collection("matches").findOne({ _id: new ObjectId(matchId) });
  if (!match) {
    res.status(404).json({ error: "Match not found." });
    return;
  }

  const isMember = match.userA.equals(user._id) || match.userB.equals(user._id);
  if (!isMember) {
    res.status(403).json({ error: "You are not part of this match." });
    return;
  }

  req.user = user;
  req.match = match;
  req.otherUserId = match.userA.equals(user._id) ? match.userB : match.userA;
  next();
}

// Match list for the current user, each entry paired with the other participant's visibility-filtered info and a summary of the most recent message (or null for a fresh match nobody's messaged in yet).
router.get("/matches", requireAuth, async (req, res) => {
  const db = await getDb();
  const matches = await db
    .collection("matches")
    .find({ $or: [{ userA: req.user._id }, { userB: req.user._id }] })
    .toArray();

  if (matches.length === 0) {
    res.json([]);
    return;
  }

  // Batch-fetch every other participant in one query rather than one query per match.
  const otherUserIds = matches.map((match) => (match.userA.equals(req.user._id) ? match.userB : match.userA));
  const otherUsers = await db
    .collection("users")
    .find({ _id: { $in: otherUserIds } }, { projection: PUBLIC_QUERY_PROJECTION })
    .toArray();
  const otherUsersById = new Map(otherUsers.map((user) => [user._id.toString(), user]));

  // Same batching for messages, sorted descending so the first one seen per matchId while grouping below is the most recent - a plain query + JS grouping instead of a $lookup aggregation, consistent with this codebase's existing query style.
  const matchIds = matches.map((match) => match._id);
  const recentMessages = await db
    .collection("messages")
    .find({ matchId: { $in: matchIds } })
    .sort({ createdAt: -1 })
    .toArray();
  const lastMessageByMatchId = new Map();
  for (const message of recentMessages) {
    const key = message.matchId.toString();
    if (!lastMessageByMatchId.has(key)) {
      lastMessageByMatchId.set(key, message);
    }
  }

  const result = matches
    .map((match) => {
      const otherUserId = match.userA.equals(req.user._id) ? match.userB : match.userA;
      const otherUser = otherUsersById.get(otherUserId.toString());
      if (!otherUser) return null; // shouldn't happen in practice - a match always references two real, still-existing users

      const lastMessage = lastMessageByMatchId.get(match._id.toString()) ?? null;
      return {
        id: match._id.toString(),
        otherUser: { id: otherUser._id.toString(), ...projectVisibleFields(otherUser) },
        lastMessage: lastMessage
          ? { senderId: lastMessage.senderId.toString(), text: lastMessage.text, createdAt: lastMessage.createdAt }
          : null,
        matchedAt: match.createdAt,
      };
    })
    .filter(Boolean);

  // Most recently active conversation first; a message-less match sorts by when it was created instead.
  result.sort((a, b) => {
    const aTime = new Date(a.lastMessage?.createdAt ?? a.matchedAt).getTime();
    const bTime = new Date(b.lastMessage?.createdAt ?? b.matchedAt).getTime();
    return bTime - aTime;
  });

  res.json(result);
});

// Full thread history for one match, oldest first.
router.get("/matches/:matchId/messages", requireMatchMembership, async (req, res) => {
  const db = await getDb();
  const messages = await db
    .collection("messages")
    .find({ matchId: req.match._id })
    .sort({ createdAt: 1 })
    .toArray();

  res.json(
    messages.map((message) => ({
      id: message._id.toString(),
      senderId: message.senderId.toString(),
      text: message.text,
      createdAt: message.createdAt,
    }))
  );
});

// Sends one message into a match's thread; senderId always comes from the session, never the client, so nobody can post as the other participant.
router.post("/matches/:matchId/messages", requireMatchMembership, async (req, res) => {
  const trimmed = typeof req.body.text === "string" ? req.body.text.trim() : "";
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message must be 1-${MAX_MESSAGE_LENGTH} characters.` });
    return;
  }

  const message = { matchId: req.match._id, senderId: req.user._id, text: trimmed, createdAt: new Date() };
  const db = await getDb();
  const result = await db.collection("messages").insertOne(message);

  const responseMessage = {
    id: result.insertedId.toString(),
    senderId: message.senderId.toString(),
    text: message.text,
    createdAt: message.createdAt,
  };

  // Both participants, not just "the other one" - covers the sender's own other open tabs too; whichever tab actually POSTed this already has it from the HTTP response below, and the client-side de-dup absorbs the echo it receives here.
  broadcastToUsers([req.match.userA, req.match.userB], {
    type: "message",
    matchId: req.match._id.toString(),
    message: responseMessage,
  });

  res.status(201).json(responseMessage);
});

module.exports = router;
