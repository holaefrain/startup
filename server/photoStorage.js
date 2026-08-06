const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { s3Client, bucketName } = require("./s3Client");

// Deleting a set of photo objects is the one S3 operation more than one caller needs - the delete cascade in server/accountCascade.js and the signup handler's own cleanup when a write fails after the upload. Kept here so both share the batching rather than each growing its own copy of it.

// S3 caps DeleteObjects at 1000 keys per call.
const S3_DELETE_BATCH = 1000;

function chunk(items, size) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

// Best-effort by design, and that's the whole point of the flag it returns. Every caller is already on a path where something either succeeded or failed on its own terms - an account was deleted, or a signup was rejected - and none of them should turn into a different error because the tidying up afterwards didn't work. A leaked object is cheap; a delete that reports failure after the account is already gone is not.
async function deletePhotoObjects(keys) {
  if (!keys || keys.length === 0) return { deleted: 0, ok: true };

  let deleted = 0;
  let ok = true;
  for (const batch of chunk(keys, S3_DELETE_BATCH)) {
    try {
      await s3Client.send(
        new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects: batch.map((Key) => ({ Key })) } })
      );
      deleted += batch.length;
    } catch (error) {
      ok = false;
      // Logged rather than thrown so one bad batch doesn't abandon the rest, and so an orphan that survives leaves a trace to find it by.
      console.error("Failed to delete photo objects", batch.length, "keys:", error.message);
    }
  }
  return { deleted, ok };
}

module.exports = { deletePhotoObjects };
