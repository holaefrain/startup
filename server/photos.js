const express = require("express");
const { ObjectId } = require("mongodb");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");
const { getDb } = require("./dbClient");
const { getAuthenticatedUser } = require("./authHelpers");
const { SAFE_IMAGE_CONTENT_TYPES } = require("./imageTypes");

const router = express.Router();

// Streams a stored profile photo through the server rather than presigning a direct S3 URL - keeps the bucket private and reuses the same session-cookie auth every other route already relies on, with no new AWS SDK dependency. Looks the key up from `:userId`'s own photoKeys instead of trusting one in the URL, so a request can only ever reach a real stored photo slot, never an arbitrary S3 key.
router.get("/photos/:userId/:index", async (req, res) => {
  const currentUser = await getAuthenticatedUser(req);
  if (!currentUser) {
    res.status(401).json({ msg: "Unauthorized" });
    return;
  }

  const { userId, index } = req.params;
  if (!ObjectId.isValid(userId)) {
    res.status(404).end();
    return;
  }

  const db = await getDb();
  const owner = await db.collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { photoKeys: 1 } });
  const key = owner?.photoKeys?.[Number(index)];
  if (!key) {
    res.status(404).end();
    return;
  }

  try {
    const object = await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    const contentType = SAFE_IMAGE_CONTENT_TYPES.has(object.ContentType) ? object.ContentType : "application/octet-stream";
    res.set("Content-Type", contentType);
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "private, max-age=3600");
    object.Body.pipe(res);
  } catch {
    res.status(404).end();
  }
});

module.exports = router;
