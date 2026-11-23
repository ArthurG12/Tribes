import test from "node:test";
import assert from "node:assert/strict";
import { createSessionToken, digestSessionToken, hashPassword, passwordPolicyError, verifyPassword } from "../security.mjs";
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

test("password policy requires 6+ characters, one uppercase letter and one special character", () => {
  assert.equal(passwordPolicyError("Ab!def"), null);
  assert.equal(passwordPolicyError("Áb-def"), null);
  assert.equal(passwordPolicyError("TribesDemo2026!"), null);
  assert.match(passwordPolicyError("Ab!de"), /entre 6 e 128/);
  assert.match(passwordPolicyError("ab!defgh"), /maiúscula/);
  assert.match(passwordPolicyError("Abcdefgh1"), /especial/);
  assert.match(passwordPolicyError("Abc def 12"), /especial/);
  assert.match(passwordPolicyError("A!".repeat(65)), /entre 6 e 128/);
  assert.match(passwordPolicyError(undefined), /senha/);
});

test("existing hashes keep verifying regardless of the current password policy", async () => {
  const legacy = await hashPassword("senha-antiga-sem-maiuscula");
  assert.notEqual(passwordPolicyError("senha-antiga-sem-maiuscula"), null);
  assert.equal(await verifyPassword("senha-antiga-sem-maiuscula", legacy), true);
});
