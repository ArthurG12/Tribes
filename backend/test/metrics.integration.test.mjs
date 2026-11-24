import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { digestSessionToken } from "../security.mjs";

const origin = process.env.TRIBES_TEST_ORIGIN;
const integrationTest = origin && process.env.DATABASE_URL ? test : test.skip;

integrationTest("analytics ingestion deduplicates session signals and keeps aggregate reads private", async (t) => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  let rawToken;
  let sessionHash;
  t.after(async () => {
    if (sessionHash) await pool.query("DELETE FROM analytics_sessions WHERE session_hash = $1", [sessionHash]);
    await pool.end();
  });

  const publicRead = await fetch(`${origin}/api/admin/metrics`);
  assert.notEqual(publicRead.status, 200);
  assert.ok([401, 503].includes(publicRead.status));

  const eventRequest = (cookie) => fetch(`${origin}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ event: "page_view", pagePath: "/" }),
  });
  const first = await eventRequest();
  assert.equal(first.status, 200);
  const setCookie = first.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Max-Age=86400/);
  const tokenMatch = setCookie.match(/tribes_analytics=([^;]+)/);
  assert.ok(tokenMatch);
  rawToken = decodeURIComponent(tokenMatch[1]);
  sessionHash = digestSessionToken(rawToken);
  assert.deepEqual(await first.json(), { ok: true });

  const second = await eventRequest(`tribes_analytics=${rawToken}`);
  assert.equal(second.status, 200);
  const totals = await pool.query(
    "SELECT COUNT(*)::int AS count FROM analytics_events WHERE session_hash = $1 AND event_key = 'page_view'",
    [sessionHash]
  );
  assert.equal(totals.rows[0].count, 1);

  const invalidEvent = await fetch(`${origin}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "fake_signup" }),
  });
  assert.equal(invalidEvent.status, 400);

  const forgedCompletion = await fetch(`${origin}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "registration_complete" }),
  });
  assert.equal(forgedCompletion.status, 400);

  const retiredEndpoint = await fetch(`${origin}/api/mvp-metrics`);
  assert.equal(retiredEndpoint.status, 410);
});
