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

// Production runs behind Caddy, so without this every request's req.ip would resolve to Caddy's own address instead of the real client - silently defeating any per-IP rate limiting. `1` trusts exactly the immediate hop (Caddy), not the whole X-Forwarded-For chain.

app.set("trust proxy", 1);
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

// Sibling to server/, not inside it: matches how dbClient.js already
// resolves dbConfig.json one level up. Locally this directory doesn't
// exist (Vite serves the frontend instead), so this is a no-op in dev -
// it only does anything once a production deploy places a built React
// bundle here (see deployReact.sh).
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status || (error instanceof multer.MulterError ? 400 : 500);
  res.status(status).json({ error: error.message || "Something went wrong." });
});

// React Router client-side routes (e.g. /discover) aren't real files, so
// any GET that didn't match an API route or a static asset falls back to
// the SPA shell and lets the frontend router take it from there.
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), (error) => {
    if (error) res.status(404).end();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
