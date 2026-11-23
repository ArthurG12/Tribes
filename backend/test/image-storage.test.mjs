import test from "node:test";
import assert from "node:assert/strict";
import { MAX_IMAGE_SIZE, parseImage } from "../images.mjs";
import { createObjectStorage, ObjectStorageError } from "../object-storage.mjs";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmL8AAAAASUVORK5CYII=";

test("accepts an allowed image based on its actual file signature", async () => {
  const image = await parseImage(`data:image/png;base64,${png}`);
  assert.equal(image.mimeType, "image/png");
  assert.equal(image.width, 1);
  assert.equal(image.height, 1);
  assert.ok(image.data.length > 0);
});

test("rejects declared MIME types that do not match the actual bytes", async () => {
  await assert.rejects(
    parseImage(`data:image/jpeg;base64,${png}`),
    { statusCode: 400 }
  );
  await assert.rejects(parseImage("data:image/png;base64,ZmFrZQ=="), { statusCode: 400 });
});

test("rejects images with excessive pixel dimensions", async () => {
  const oversizedDimensions = Buffer.from(png, "base64");
  oversizedDimensions.writeUInt32BE(5000, 16);
  await assert.rejects(
    parseImage(`data:image/png;base64,${oversizedDimensions.toString("base64")}`),
    { statusCode: 400 }
  );
});

test("rejects image data above five MiB", async () => {
  const oversized = Buffer.alloc(MAX_IMAGE_SIZE + 1).toString("base64");
  await assert.rejects(parseImage(`data:image/png;base64,${oversized}`), { statusCode: 400 });
});

test("generates unique server-controlled object keys", () => {
  const storage = createObjectStorage();
  const first = storage.createImageKey("content", "image/png");
  const second = storage.createImageKey("content", "image/png");
  assert.match(first, /^content\/[0-9a-f-]+\.png$/);
  assert.notEqual(first, second);
  assert.throws(() => storage.createImageKey("content", "image/svg+xml"), ObjectStorageError);
});

test("creates a short-lived signed URL without making the object public", async () => {
  const storage = createObjectStorage({
    accountId: "test-account",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    bucketName: "tribes-media",
    endpoint: "https://example.r2.cloudflarestorage.com",
  });
  const url = new URL(await storage.createReadUrl("content/test.png", "image/png"));
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.ok(url.searchParams.has("X-Amz-Signature"));
  assert.match(url.searchParams.get("X-Amz-Credential"), /\/auto\/s3\/aws4_request$/);
  assert.equal(url.pathname, "/tribes-media/content/test.png");
});

test("reports a real S3 connection failure as a sanitized storage error", async () => {
  const storage = createObjectStorage({
    accountId: "test-account",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    bucketName: "tribes-media",
    endpoint: "http://127.0.0.1:1",
  });
  await assert.rejects(
    storage.putObject("content/test.png", Buffer.from("data"), "image/png"),
    (error) => error instanceof ObjectStorageError && error.statusCode === 503 && !error.message.includes("test-secret-key")
  );
});
