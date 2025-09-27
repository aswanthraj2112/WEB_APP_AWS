import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConfig } from "../config.js";

let s3Client;

async function getClient() {
  if (!s3Client) {
    const config = await getConfig();
    s3Client = new S3Client({ region: config.region });
  }
  return s3Client;
}

export async function createUploadUrl({ key, contentType, ttl }) {
  const client = await getClient();
  const config = await getConfig();
  const command = new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    ContentType: contentType
  });
  return getSignedUrl(client, command, { expiresIn: ttl });
}

export async function createPlaybackUrl(key, ttl) {
  if (!key) return null;
  const client = await getClient();
  const config = await getConfig();
  const command = new GetObjectCommand({
    Bucket: config.s3Bucket,
    Key: key
  });
  return getSignedUrl(client, command, { expiresIn: ttl });
}

export async function deleteObject(key) {
  const client = await getClient();
  const config = await getConfig();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.s3Bucket,
      Key: key
    })
  );
}
