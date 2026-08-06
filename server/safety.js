const express = require("express");
const rateLimit = require("express-rate-limit");
const { ObjectId } = require("mongodb");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { PUBLIC_QUERY_PROJECTION, projectVisibleFields } = require("./userSchema");
const { blockedUserIds, createBlock, removeBlock } = require("./blocks");

const router = express.Router();

// Reporting is the one thing on this page someone may be doing while upset, so the budget is loose enough that a second report about a second person never hits a wall. It exists to stop a script, not a person.
const safetyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many requests. Please try again later." },
});

async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}

// Allow-listed server-side rather than trusted from the body, the same principle pickVisibility uses in server/profile.js - a reason outside this set is a client bug or an attack, and either way it shouldn't reach a review queue as free text pretending to be a category.
const REPORT_REASONS = new Set([
  "harassment",
  "fake",
  "photos",
  "scam",
  "underage",
  "safety",
  "other",
]);

const MAX_REPORT_DETAILS = 2000; // matches chat.js's MAX_MESSAGE_LENGTH - both are "a person typing a paragraph"

// Parses the optional { kind, matchId, messageId } that says where the report was filed from. Never trusted for authorisation - it only tells a reviewer where to look, so a wrong matchId here misleads nobody into seeing anything.
function pickContext(source) {
  if (!source || typeof source !== "object") return { kind: "profile" };
  const kind = source.kind === "message" ? "message" : "profile";
  const context = { kind };
  if (typeof source.matchId === "string" && ObjectId.isValid(source.matchId)) {
    context.matchId = new ObjectId(source.matchId);
  }
  if (typeof source.messageId === "string" && ObjectId.isValid(source.messageId)) {
    context.messageId = new ObjectId(source.messageId);
  }
  return context;
}

// Files a report and, by default, blocks the reported account in the same request - the two are one action from the reporter's side, and splitting them into two round trips means a failure between them leaves someone reported but still able to reach you.
// README.md describes flagged content routing to a coach review queue; `status: "open"` is the field that queue reads.
router.post("/reports", safetyRateLimit, requireAuth, async (req, res) => {
  const { reportedUserId, reason, details, block = true } = req.body;

  if (typeof reportedUserId !== "string" || !ObjectId.isValid(reportedUserId)) {
    res.status(400).json({ error: "Invalid reportedUserId." });
    return;
  }
  const reportedId = new ObjectId(reportedUserId);

  if (reportedId.equals(req.user._id)) {
    res.status(400).json({ error: "You can't report your own account." });
    return;
  }
  if (!REPORT_REASONS.has(reason)) {
    res.status(400).json({ error: "Choose a reason for the report." });
    return;
  }

  const db = await getDb();
  const reported = await db.collection("users").findOne({ _id: reportedId }, { projection: { _id: 1 } });
  if (!reported) {
    res.status(404).json({ error: "That account no longer exists." });
    return;
  }

  await db.collection("reports").insertOne({
    reporterId: req.user._id,
    reportedUserId: reportedId,
    reason,
    details: typeof details === "string" ? details.trim().slice(0, MAX_REPORT_DETAILS) : "",
    context: pickContext(req.body.context),
    status: "open",
    createdAt: new Date(),
  });

  if (block !== false) {
    await createBlock(db, req.user._id, reportedId);
  }

  res.status(201).json({ ok: true, blocked: block !== false });
});

// The blocked list, for the Settings page. Only accounts *this* user blocked - someone who blocked you is deliberately absent, since surfacing them would turn a safety tool into a notification that you'd been blocked.
router.get("/blocks", requireAuth, async (req, res) => {
  const db = await getDb();
  const rows = await db
    .collection("blocks")
    .find({ blockerId: req.user._id })
    .sort({ createdAt: -1 })
    .toArray();

  if (rows.length === 0) {
    res.json([]);
    return;
  }

  const blockedIds = rows.map((row) => row.blockedId);
  const users = await db
    .collection("users")
    .find({ _id: { $in: blockedIds } }, { projection: PUBLIC_QUERY_PROJECTION })
    .toArray();
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  // A blocked account that has since deleted itself leaves a row pointing at nothing; it's dropped from the list rather than rendered as a blank entry nobody can act on.
  res.json(
    rows
      .map((row) => {
        const user = usersById.get(row.blockedId.toString());
        if (!user) return null;
        const visible = projectVisibleFields(user);
        return {
          id: row.blockedId.toString(),
          first_name: visible.first_name ?? "",
          last_name: visible.last_name ?? "",
          photoKeys: visible.photoKeys ?? [],
          blockedAt: row.createdAt,
        };
      })
      .filter(Boolean)
  );
});

router.post("/blocks", safetyRateLimit, requireAuth, async (req, res) => {
  const { userId } = req.body;
  if (typeof userId !== "string" || !ObjectId.isValid(userId)) {
    res.status(400).json({ error: "Invalid userId." });
    return;
  }
  const blockedId = new ObjectId(userId);
  if (blockedId.equals(req.user._id)) {
    res.status(400).json({ error: "You can't block your own account." });
    return;
  }

  const db = await getDb();
  const target = await db.collection("users").findOne({ _id: blockedId }, { projection: { _id: 1 } });
  if (!target) {
    res.status(404).json({ error: "That account no longer exists." });
    return;
  }

  await createBlock(db, req.user._id, blockedId);
  res.status(201).json({ ok: true });
});

router.delete("/blocks/:userId", safetyRateLimit, requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (!ObjectId.isValid(userId)) {
    res.status(400).json({ error: "Invalid userId." });
    return;
  }

  const db = await getDb();
  const removed = await removeBlock(db, req.user._id, new ObjectId(userId));
  if (!removed) {
    res.status(404).json({ error: "You haven't blocked that account." });
    return;
  }

  res.json({ ok: true });
});

// Exported for the enforcement sites, which import the helper rather than this router.
module.exports = { router, blockedUserIds };
