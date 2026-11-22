import "./load-env.mjs";
import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.R2_REGION ?? "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  maxAttempts: 1,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const bucket = process.env.R2_BUCKET_NAME;

let ready = false;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    ready = true;
    break;
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404 || error.name === "NotFound" || error.name === "NoSuchBucket") {
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
        ready = true;
        break;
      } catch (createError) {
        if (createError.name === "BucketAlreadyOwnedByYou") {
          ready = true;
          break;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

client.destroy();
if (!ready) {
  console.error("Não foi possível inicializar o bucket local de objetos.");
  process.exitCode = 1;
} else {
  console.log(`Bucket local ${bucket} pronto.`);
}
