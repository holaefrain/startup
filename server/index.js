const path = require("path");
const http = require("http");
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
const profileRouter = require("./profile");
const photosRouter = require("./photos");
const swipesRouter = require("./swipes");
const chatRouter = require("./chat");
const placesRouter = require("./places");
const { attachWebSocketServer } = require("./websocket");

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

// Service Deilverable: Node.js/Express HTTP service
const app = express();

// Production runs behind Caddy, so without this every request's req.ip would resolve to Caddy's own address instead of the real client - silently defeating any per-IP rate limiting. `1` trusts exactly the immediate hop (Caddy), not the whole X-Forwarded-For chain.

app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());
// Service Deilverable: Backend service endpoints
app.use("/api", authRouter);
app.use("/api", discoverRouter);
app.use("/api", profileRouter);
app.use("/api", photosRouter);
app.use("/api", swipesRouter);
app.use("/api", chatRouter);
app.use("/api", placesRouter);

// Single signup endpoint: the wizard collects all 5 steps in one component and submits once at the end, so this does one insert rather than creating a document in step 1 and patching it across separate requests.
app.post("/api/signup", upload.array("photos", MAX_PHOTOS), async (req, res) => {
  const fields = pickFields(req.body, USER_FIELDS);
  const db = await getDb();
  const users = db.collection("users");

  // Read-only check, purely for a faster/clearer error - never mutates another identity's data based on an unauthenticated email match (that was the account-takeover bug in an earlier version of this handler: silently reusing and overwriting a stranger's in-progress profile, including deleting their S3 photos, with no proof of ownership). A genuinely fresh ObjectId/insert below is what actually keeps this safe.
  const existing = await users.findOne({ email: fields.email });
  if (existing?.password) {
    res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
    return;
  }

  // Generated up front so the same id is both the Mongo _id and the S3 key prefix for this user's photos. Always fresh, never reused from an existing doc - an abandoned bare (no-password) profile from an earlier interrupted attempt is left alone rather than overwritten, and instead ages out on its own via the TTL index on createdAt (see the index setup script/notes).
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

  try {
    await users.insertOne({ _id: userId, ...fields, photoKeys, registered: false, createdAt: new Date() });
  } catch (err) {
    // The email_unique_registered index can only ever conflict here if `fields` somehow carried a password through pickFields, which USER_FIELDS excludes by design - this is defense-in-depth, not the primary guard (the findOne check above is).
    if (err.code === 11000) {
      res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
      return;
    }
    throw err;
  }

  res.status(201).json({ userId: userId.toString() });
});

// Sibling to server/, not inside it - the built frontend bundle isn't backend code. Locally this directory doesn't exist (Vite serves the frontend instead), so this is a no-op in dev - it only does anything once a production deploy places a built React bundle here (see deployReact.sh).
const PUBLIC_DIR = path.join(__dirname, "..", "public");
// Service Deilverable: Static middleware for frontend
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

// http.createServer(app) instead of app.listen(...) directly, so attachWebSocketServer has a server instance to hook its own 'upgrade' handler onto before anything starts listening - app.listen() would have created one internally but never exposed it.
const server = http.createServer(app);
attachWebSocketServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
