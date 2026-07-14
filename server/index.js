const path = require("path");
const express = require("express");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const { ObjectId } = require("mongodb");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");
const { getDb } = require("./dbClient");
const { USER_FIELDS, pickFields } = require("./userSchema");
const authRouter = require("./auth");
const discoverRouter = require("./discover");

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
app.use(express.json());
app.use(cookieParser());
app.use("/api", authRouter);
app.use("/api", discoverRouter);

// Single signup endpoint: the wizard collects all 5 steps in one component
// and submits once at the end, so this does one insert rather than
// creating a document in step 1 and patching it across separate requests.
app.post("/api/signup", upload.array("photos", MAX_PHOTOS), async (req, res) => {
  // Generated up front so the same id is both the Mongo _id and the S3 key
  // prefix for this user's photos.
  const userId = new ObjectId();

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

  const fields = pickFields(req.body, USER_FIELDS);
  const db = await getDb();
  await db.collection("users").insertOne({
    _id: userId,
    ...fields,
    photoKeys,
    createdAt: new Date(),
  });

  res.status(201).json({ userId: userId.toString() });
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
