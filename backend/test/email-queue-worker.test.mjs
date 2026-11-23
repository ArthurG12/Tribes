import test from "node:test";
import assert from "node:assert/strict";
import { nextResendQuotaReset } from "../email-queue-worker.mjs";

test("daily Resend quota pause ends at midnight UTC", () => {
  const now = new Date("2026-11-23T23:59:59.000Z");
  assert.equal(
    nextResendQuotaReset("daily_quota_exceeded", now).toISOString(),
    "2026-11-24T00:00:00.000Z"
  );
});

test("monthly Resend quota pause ends at the start of the next UTC month", () => {
  const now = new Date("2026-11-23T12:00:00.000Z");
  assert.equal(
    nextResendQuotaReset("monthly_quota_exceeded", now).toISOString(),
    "2026-12-01T00:00:00.000Z"
  );
});

test("other Resend errors do not pause the queue until a quota reset", () => {
  assert.equal(nextResendQuotaReset("rate_limit_exceeded", new Date("2026-11-23T12:00:00.000Z")), null);
});
