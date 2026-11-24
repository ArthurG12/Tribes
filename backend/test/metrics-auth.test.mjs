import test from "node:test";
import assert from "node:assert/strict";
import { isMetricsAdmin, parseMetricsAdminEmails } from "../metrics-auth.mjs";

test("admin allowlist splits, trims and normalizes configured addresses", () => {
  const emails = parseMetricsAdminEmails(" Admin@Example.com, ,ops@example.com ");

  assert.equal(emails.size, 2);
  assert.ok(emails.has("admin@example.com"));
  assert.ok(emails.has("ops@example.com"));
});

test("admin access requires an exact allowlisted email", () => {
  const emails = new Set(["admin@example.com"]);

  assert.equal(isMetricsAdmin(" ADMIN@example.com ", emails), true);
  assert.equal(isMetricsAdmin("admin+other@example.com", emails), false);
  assert.equal(isMetricsAdmin(undefined, emails), false);
});

test("empty admin configuration fails closed", () => {
  assert.equal(isMetricsAdmin("admin@example.com", parseMetricsAdminEmails(" , ")), false);
});
