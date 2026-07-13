const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");

// Exercises the same put/get/delete permissions the photo upload feature
// needs, instead of HeadBucketCommand (which needs separate s3:ListBucket
// permission on the bucket itself and isn't part of the app's IAM policy).
const TEST_KEY = "photos/.connection-test";

async function main() {
  if (!bucketName) {
    console.error("AWS_S3_BUCKET_NAME is not set — check your .env file.");
    process.exit(1);
  }

  await s3Client.send(
    new PutObjectCommand({ Bucket: bucketName, Key: TEST_KEY, Body: "connection test" })
  );
  await s3Client.send(new GetObjectCommand({ Bucket: bucketName, Key: TEST_KEY }));
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: TEST_KEY }));

  console.log(`Connected to S3 bucket "${bucketName}" successfully (put/get/delete all succeeded).`);
}

main().catch((error) => {
  const statusCode = error.$metadata?.httpStatusCode;
  console.error(`Could not reach the S3 bucket: ${error.name} (HTTP ${statusCode})`);
  if (statusCode === 403) {
    console.error("403 = credentials are being sent but don't have permission — check the IAM policy on your access key.");
  } else if (statusCode === 404) {
    console.error("404 = credentials are valid but the bucket name/region don't match — check AWS_S3_BUCKET_NAME and AWS_REGION.");
  } else if (!statusCode) {
    console.error("No HTTP response at all — likely missing/malformed AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_REGION in .env.");
  }
  process.exit(1);
});
