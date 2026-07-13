const { S3Client } = require("@aws-sdk/client-s3");
const { fromEnv } = require("@aws-sdk/credential-providers");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

module.exports = { s3Client, bucketName: process.env.AWS_S3_BUCKET_NAME };
