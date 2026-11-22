import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const READ_URL_TTL_SECONDS = 300;

export class ObjectStorageError extends Error {
  constructor(message = "O armazenamento de imagens está indisponível.") {
    super(message);
    this.name = "ObjectStorageError";
    this.statusCode = 503;
  }
}

export function createObjectStorage(overrides = {}) {
  const endpoint = overrides.endpoint ?? process.env.R2_ENDPOINT;
  let endpointHost = "";
  try { endpointHost = new URL(endpoint).hostname; } catch {}
  const config = {
    accountId: overrides.accountId ?? process.env.R2_ACCOUNT_ID,
    accessKeyId: overrides.accessKeyId ?? process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: overrides.secretAccessKey ?? process.env.R2_SECRET_ACCESS_KEY,
    bucketName: overrides.bucketName ?? process.env.R2_BUCKET_NAME,
    endpoint,
    publicEndpoint: overrides.publicEndpoint ?? process.env.R2_PUBLIC_ENDPOINT,
    region: overrides.region ?? (endpointHost.endsWith(".r2.cloudflarestorage.com")
      ? "auto"
      : process.env.R2_REGION ?? "auto"),
  };

  let client;
  let signingClient;

  function getClient(endpoint = config.endpoint) {
    if (!endpoint || !config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      throw new ObjectStorageError("O armazenamento de imagens não está configurado.");
    }
    if (endpoint === config.endpoint && client) return client;
    if (endpoint === config.publicEndpoint && signingClient) return signingClient;

    const created = new S3Client({
      region: config.region,
      endpoint,
      forcePathStyle: true,
      maxAttempts: 1,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    if (endpoint === config.endpoint) client = created;
    else if (endpoint === config.publicEndpoint) signingClient = created;
    return created;
  }

  function createImageKey(kind, mimeType, ownerId) {
    const extension = EXTENSIONS.get(mimeType);
    if (!extension) throw new ObjectStorageError("Tipo de imagem não permitido.");
    const id = randomUUID();
    if (kind === "content") return `content/${id}.${extension}`;
    if (kind === "avatar" && ownerId) return `avatars/${ownerId}/${id}.${extension}`;
    throw new ObjectStorageError("Não foi possível gerar a referência da imagem.");
  }

  async function putObject(key, data, mimeType) {
    try {
      await getClient().send(new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: data,
        ContentLength: data.length,
        ContentType: mimeType,
        CacheControl: "private, no-store",
      }));
    } catch {
      throw new ObjectStorageError();
    }
  }

  async function getObject(key) {
    let response;
    try {
      response = await getClient().send(new GetObjectCommand({ Bucket: config.bucketName, Key: key }));
      const bytes = Buffer.from(await response.Body.transformToByteArray());
      return { data: bytes, mimeType: response.ContentType, size: response.ContentLength };
    } catch {
      throw new ObjectStorageError();
    }
  }

  async function deleteObject(key) {
    try {
      await getClient().send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
    } catch {
      throw new ObjectStorageError();
    }
  }

  async function createReadUrl(key, mimeType) {
    try {
      const signer = getClient(config.publicEndpoint || config.endpoint);
      return await getSignedUrl(signer, new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        ResponseContentType: mimeType,
        ResponseCacheControl: "private, no-store",
      }), { expiresIn: READ_URL_TTL_SECONDS });
    } catch (error) {
      if (error instanceof ObjectStorageError) throw error;
      throw new ObjectStorageError();
    }
  }

  async function putImage(kind, image, ownerId) {
    const key = createImageKey(kind, image.mimeType, ownerId);
    await putObject(key, image.data, image.mimeType);
    return key;
  }

  return { createImageKey, putImage, putObject, getObject, deleteObject, createReadUrl };
}

let defaultStorage;

export function getObjectStorage() {
  defaultStorage ??= createObjectStorage();
  return defaultStorage;
}

export function resetObjectStorageForTests() {
  defaultStorage = undefined;
}
