const path = require("path");
const express = require("express");
const multer = require("multer");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { PROFILE_EDITABLE_FIELDS, VISIBILITY_FIELDS, pickFields } = require("./userSchema");
const { SAFE_IMAGE_CONTENT_TYPES } = require("./imageTypes");

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB, matches server/index.js's signup upload limit
const MAX_PHOTOS = 8; // matches server/index.js's signup upload cap

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!SAFE_IMAGE_CONTENT_TYPES.has(file.mimetype)) {
      const error = new Error("Only JPEG, PNG, WEBP, or GIF images are allowed.");
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

// Appends to the end of photoKeys (capped at MAX_PHOTOS) rather than overwriting a slot - matches the array server/index.js's signup handler already builds, so photos added post-signup use the same key scheme (photos/<userId>/<n><ext>).
router.post("/profile/photo", requireAuth, upload.single("photo"), async (req, res) => {
  const { user } = req;
  if (!req.file) {
    res.status(400).json({ error: "No photo provided." });
    return;
  }

  const existingKeys = user.photoKeys ?? [];
  if (existingKeys.length >= MAX_PHOTOS) {
    res.status(400).json({ error: `You can have up to ${MAX_PHOTOS} photos.` });
    return;
  }

  const extension = path.extname(req.file.originalname) || "";
  const key = `photos/${user._id}/${existingKeys.length + 1}${extension}`;
  await s3Client.send(
    new PutObjectCommand({ Bucket: bucketName, Key: key, Body: req.file.buffer, ContentType: req.file.mimetype })
  );

  const photoKeys = [...existingKeys, key];
  const db = await getDb();
  await db.collection("users").updateOne({ _id: user._id }, { $set: { photoKeys } });

  res.json({ photoKeys });
});

// Deletion is scoped to the authenticated user's own _id from their session token, never a client-supplied identity - same account-takeover-avoidance pattern as the rest of this file.
router.delete("/profile/photo/:index", requireAuth, async (req, res) => {
  const { user } = req;
  const index = Number(req.params.index);
  const existingKeys = user.photoKeys ?? [];
  const key = existingKeys[index];
  if (key === undefined) {
    res.status(404).json({ error: "Photo not found." });
    return;
  }

  await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));

  const photoKeys = existingKeys.filter((_, i) => i !== index);
  const db = await getDb();
  await db.collection("users").updateOne({ _id: user._id }, { $set: { photoKeys } });

  res.json({ photoKeys });
});

module.exports = router;
