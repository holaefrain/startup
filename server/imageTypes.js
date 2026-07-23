// Shared between the S3 upload routes (server/profile.js, server/index.js) and the S3 serve route (server/photos.js) - upload-side filtering and serve-side re-validation must agree on the same allowlist, or a type accepted at upload could get silently served back as application/octet-stream.
const SAFE_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

module.exports = { SAFE_IMAGE_CONTENT_TYPES };
