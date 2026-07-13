const crypto = require("crypto");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");

const MAX_PHOTOS = 8;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB per photo

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_PHOTOS },
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

const app = express();

app.post("/api/signup/photos", upload.array("photos", MAX_PHOTOS), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400).json({ error: "No photos were uploaded." });
    return;
  }

  // TODO: replace with the real signed-in user's id once auth + MongoDB exist.
  const userId = crypto.randomUUID();

  const photoKeys = await Promise.all(
    req.files.map((file, index) => {
      const extension = path.extname(file.originalname) || "";
      const key = `photos/${userId}/${index + 1}${extension}`;
      return s3Client
        .send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        )
        .then(() => key);
    })
  );

  res.status(201).json({ userId, photoKeys });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  res.status(status).json({ error: error.message || "Something went wrong." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
