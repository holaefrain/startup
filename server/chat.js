const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser, requireMatchMembership } = require("./authHelpers");
const { PUBLIC_QUERY_PROJECTION, projectVisibleFields } = require("./userSchema");
const { broadcastToUsers } = require("./websocket");

const MAX_MESSAGE_LENGTH = 2000;
const MAX_VENUE_FIELD_LENGTH = 300;
const MAX_WHEN_FIELD_LENGTH = 40;

// The venue fields worth persisting on a date proposal - a snapshot, deliberately, so a sent plan keeps reading the same way months later even if the place closes, is renamed, or drops off Google entirely.
const VENUE_SNAPSHOT_TEXT_FIELDS = ["id", "name", "address", "kind", "hours", "price", "photoName"];

const router = express.Router();

// The venue arrives in a request body, so it's untrusted even though it originated from GET /api/venues - allow-listed and length-capped the same way userSchema.js's pickFields treats every other client-supplied object. Returns null if there's no usable name, which the caller turns into a 400.
function pickVenueSnapshot(source) {
  if (!source || typeof source !== "object") return null;

  const venue = {};
  for (const field of VENUE_SNAPSHOT_TEXT_FIELDS) {
    const value = source[field];
    if (typeof value === "string" && value.length > 0) venue[field] = value.slice(0, MAX_VENUE_FIELD_LENGTH);
  }
  if (Number.isFinite(source.rating)) venue.rating = source.rating;
  if (typeof source.openNow === "boolean") venue.openNow = source.openNow;

  return venue.name ? venue : null;
}

// { day, time } as the picker's own loose labels ("Friday", "9 PM") rather than a timestamp - the mock's date chip is a human label, not a calendar entry, and nothing downstream schedules off it.
function pickWhen(source) {
  if (!source || typeof source !== "object") return null;
  const day = typeof source.day === "string" ? source.day.trim().slice(0, MAX_WHEN_FIELD_LENGTH) : "";
  const time = typeof source.time === "string" ? source.time.trim().slice(0, MAX_WHEN_FIELD_LENGTH) : "";
  return day && time ? { day, time } : null;
}

// One shape for every message the API emits, from GET, POST, and the accept route alike. Messages written before date proposals existed have no `kind`, so they read as plain text.
function serializeMessage(message) {
  const serialized = {
    id: message._id.toString(),
    senderId: message.senderId.toString(),
    kind: message.kind ?? "text",
    text: message.text,
    createdAt: message.createdAt,
  };
  if (serialized.kind === "date") {
    serialized.venue = message.venue;
    serialized.when = message.when;
    serialized.dateStatus = message.dateStatus ?? "pending";
  }
  return serialized;
}

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
  // Unread is counted in this same pass rather than with a per-match count query - every message is already in memory here for the lastMessage summary, so the badge costs nothing extra.
  const matchesById = new Map(matches.map((match) => [match._id.toString(), match]));
  const currentUserId = req.user._id.toString();
  const lastMessageByMatchId = new Map();
  const unreadByMatchId = new Map();

  for (const message of recentMessages) {
    const key = message.matchId.toString();
    if (!lastMessageByMatchId.has(key)) {
      lastMessageByMatchId.set(key, message);
    }

    // Unread means "from the other person, and newer than the last time I opened this thread" - a match with no lastReadAt entry has never been opened, so everything they sent counts.
    if (message.senderId.equals(req.user._id)) continue;
    const lastReadAt = matchesById.get(key)?.lastReadAt?.[currentUserId];
    if (lastReadAt && message.createdAt <= lastReadAt) continue;
    unreadByMatchId.set(key, (unreadByMatchId.get(key) ?? 0) + 1);
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
        unreadCount: unreadByMatchId.get(match._id.toString()) ?? 0,
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

  res.json(messages.map(serializeMessage));
});

// Marks this match's thread read for the caller, clearing its unread badge. Stamped once per participant on the match doc rather than per message, so opening a long thread is a single small write.
router.post("/matches/:matchId/read", requireMatchMembership, async (req, res) => {
  const db = await getDb();

  // Building a dynamic update path is only safe here because the key is the caller's own ObjectId hex from the session, never anything client-supplied - it can't introduce a "$" or "." into the path.
  await db
    .collection("matches")
    .updateOne({ _id: req.match._id }, { $set: { [`lastReadAt.${req.user._id.toString()}`]: new Date() } });

  // Only to the reader's own connections, never the other participant - this clears a badge in their other open tabs, and read receipts aren't a feature of this app.
  broadcastToUsers([req.user._id], { type: "read", matchId: req.match._id.toString() });

  res.json({ ok: true });
});

// Sends one message into a match's thread; senderId always comes from the session, never the client, so nobody can post as the other participant.
router.post("/matches/:matchId/messages", requireMatchMembership, async (req, res) => {
  const kind = req.body.kind === "date" ? "date" : "text";
  const message = { matchId: req.match._id, senderId: req.user._id, kind, createdAt: new Date() };

  if (kind === "date") {
    const venue = pickVenueSnapshot(req.body.venue);
    const when = pickWhen(req.body.when);
    if (!venue || !when) {
      res.status(400).json({ error: "A date plan needs a venue and a day and time." });
      return;
    }

    // A readable summary is stored alongside the structured fields so the match list's lastMessage preview and any text-only renderer still have something to show.
    message.venue = venue;
    message.when = when;
    message.dateStatus = "pending";
    message.text = `${venue.name} - ${when.day} ${when.time}`;
  } else {
    const trimmed = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: `Message must be 1-${MAX_MESSAGE_LENGTH} characters.` });
      return;
    }
    message.text = trimmed;
  }

  const db = await getDb();
  const result = await db.collection("messages").insertOne(message);

  const responseMessage = serializeMessage({ ...message, _id: result.insertedId });

  // Both participants, not just "the other one" - covers the sender's own other open tabs too; whichever tab actually POSTed this already has it from the HTTP response below, and the client-side de-dup absorbs the echo it receives here.
  // WebSocket Deilverable: Data sent over WebSocket connection
  broadcastToUsers([req.match.userA, req.match.userB], {
    type: "message",
    matchId: req.match._id.toString(),
    message: responseMessage,
  });

  res.status(201).json(responseMessage);
});

// Accepts a date proposal the *other* participant sent. Flips the card's state for both sides and posts a confirmation into the thread - written server-side so both participants see identical wording no matter who's connected when it lands.
router.post("/matches/:matchId/messages/:messageId/accept", requireMatchMembership, async (req, res) => {
  const { messageId } = req.params;
  if (!ObjectId.isValid(messageId)) {
    res.status(400).json({ error: "Invalid messageId." });
    return;
  }

  const db = await getDb();
  const messages = db.collection("messages");

  // Scoped to req.match._id, not just the id, so a valid messageId from some other conversation can't be accepted through this match.
  const proposal = await messages.findOne({ _id: new ObjectId(messageId), matchId: req.match._id });
  if (!proposal || proposal.kind !== "date") {
    res.status(404).json({ error: "Date plan not found." });
    return;
  }
  if (proposal.senderId.equals(req.user._id)) {
    res.status(403).json({ error: "You can't accept your own date plan." });
    return;
  }
  if (proposal.dateStatus === "accepted") {
    res.status(409).json({ error: "This date plan was already accepted." });
    return;
  }

  const acceptedAt = new Date();
  await messages.updateOne(
    { _id: proposal._id },
    { $set: { dateStatus: "accepted", acceptedAt, acceptedBy: req.user._id } }
  );

  const confirmation = {
    matchId: req.match._id,
    senderId: req.user._id,
    kind: "text",
    text: `Accepted - ${proposal.when.day} at ${proposal.when.time}, ${proposal.venue.name}.`,
    createdAt: acceptedAt,
  };
  const inserted = await messages.insertOne(confirmation);
  const confirmationMessage = serializeMessage({ ...confirmation, _id: inserted.insertedId });

  // Two frames rather than one: the card's state change and the new message are separate things a client updates separately, and the message frame is the same shape a normal send already broadcasts.
  broadcastToUsers([req.match.userA, req.match.userB], {
    type: "dateAccepted",
    matchId: req.match._id.toString(),
    messageId: proposal._id.toString(),
    acceptedBy: req.user._id.toString(),
  });
  broadcastToUsers([req.match.userA, req.match.userB], {
    type: "message",
    matchId: req.match._id.toString(),
    message: confirmationMessage,
  });

  res.json({ ok: true, messageId: proposal._id.toString(), message: confirmationMessage });
});

module.exports = router;
