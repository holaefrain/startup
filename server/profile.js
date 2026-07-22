const path = require("path");
const express = require("express");
const multer = require("multer");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { PROFILE_EDITABLE_FIELDS, VISIBILITY_FIELDS, pickFields } = require("./userSchema");

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB, matches server/index.js's signup upload limit

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      const error = new Error("Only image files are allowed.");
      error.status = 400;
      cb(error);
      return;
    }
    cb(null, true);
  },
});

const router = express.Router();

// Runs before multer on the photo route specifically so an unauthenticated request is rejected before the server spends effort buffering an up-to-8MB upload into memory, not after.
async function requireAuth(req, res, next) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}

// Iterates VISIBILITY_FIELDS itself rather than the client's own object keys, so a malicious key (e.g. one containing "$" or ".") can never reach a MongoDB update path - same principle userSchema.js's pickFields already uses for field allow-listing.
function pickVisibility(source) {
  const result = {};
  for (const field of VISIBILITY_FIELDS) {
    const value = source?.[field];
    if (value === "visible" || value === "hidden") {
      result[field] = value;
    }
  }
  return result;
}

// Body is JSON { fields?: {...}, visibility?: {...} }, both allow-listed against server/userSchema.js so a client can only ever touch the exact fields Profile.jsx exposes - notably never email/phone, which each have a partial unique index (see server/index.js's account-takeover fix).
router.patch("/profile", requireAuth, async (req, res) => {
  const { user } = req;

  const fields = pickFields(req.body.fields ?? {}, PROFILE_EDITABLE_FIELDS);
  const visibility = pickVisibility(req.body.visibility);

  const set = { ...fields };
  for (const [field, value] of Object.entries(visibility)) {
    set[`visibility.${field}`] = value;
  }

  if (Object.keys(set).length === 0) {
    res.status(400).json({ error: "No valid fields to update." });
    return;
  }

  const db = await getDb();
  await db.collection("users").updateOne({ _id: user._id }, { $set: set });

  res.json({ ok: true });
});

// Deleting the previous avatar before uploading the new one is safe here specifically because both the read and the delete are scoped to the authenticated user's own _id from their session token, never a client-supplied identity - unlike the account-takeover bug this same pattern caused in an earlier version of POST /api/signup, which read/deleted someone else's key based on an unauthenticated email match.
router.patch("/profile/photo", requireAuth, upload.single("photo"), async (req, res) => {
  const { user } = req;
  if (!req.file) {
    res.status(400).json({ error: "No photo provided." });
    return;
  }

  const db = await getDb();
  const users = db.collection("users");

  const existingKey = user.photoKeys?.[0];
  if (existingKey) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: existingKey }));
  }

  const extension = path.extname(req.file.originalname) || "";
  const key = `photos/${user._id}/1${extension}`;
  await s3Client.send(
    new PutObjectCommand({ Bucket: bucketName, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype })
  );

  const photoKeys = [key, ...(user.photoKeys ?? []).slice(1)];
  await users.updateOne({ _id: user._id }, { $set: { photoKeys } });

  res.json({ photoKeys });
});

module.exports = router;
