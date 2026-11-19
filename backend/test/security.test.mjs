import test from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, digestSessionToken, hashPassword, verifyPassword } from "../security.mjs";
import { decodeCursor } from "../social-store.mjs";

test("password hashes are salted and can be verified", async () => {
  const first = await hashPassword("a-strong-password");
  const second = await hashPassword("a-strong-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("a-strong-password", first), true);
  assert.equal(await verifyPassword("incorrect-password", first), false);
});

test("session tokens are random and only represented by a digest at rest", () => {
  const first = createSessionToken();
  const second = createSessionToken();
  assert.notEqual(first, second);
  assert.equal(digestSessionToken(first).length, 64);
  assert.notEqual(digestSessionToken(first), first);
});

test("feed cursors are validated before reaching SQL", () => {
  const expected = { createdAt: "2026-01-02T03:04:05.000Z", id: "5c0a6a70-fc12-4f50-a123-77305ddfc014" };
  const encoded = Buffer.from(JSON.stringify(expected)).toString("base64url");
  assert.deepEqual(decodeCursor(encoded), expected);
  assert.throws(() => decodeCursor("not-a-cursor"), { statusCode: 400 });
  const invalidDate = Buffer.from(JSON.stringify({ ...expected, createdAt: "2026-99-99T30:90:00Z" })).toString("base64url");
  assert.throws(() => decodeCursor(invalidDate), { statusCode: 400 });
});
