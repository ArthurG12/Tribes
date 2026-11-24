import pg from "pg";
import { createSessionToken, digestSessionToken } from "./security.mjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const RANGE_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export const ANALYTICS_EVENTS = new Set([
  "page_view",
  "hero_cta_click",
  "explorer_interaction",
  "registration_start",
  "registration_complete",
]);

export const PUBLIC_ANALYTICS_EVENTS = new Set([
  "page_view",
  "hero_cta_click",
  "explorer_interaction",
  "registration_start",
]);

export const ANALYTICS_CATEGORIES = new Set([
  "esportes",
  "games",
  "rpg",
  "leitura",
  "musica",
  "artes",
  "cultura-geek",
  "programacao",
  "gastronomia",
]);

export async function checkDatabase() {
  await pool.query("SELECT 1");
}

export async function recordAnalyticsEvent({ sessionToken, event, pagePath = "", category, userId }) {
  if (!sessionToken || !ANALYTICS_EVENTS.has(event)) return;
  let activeSessionToken = sessionToken;
  let sessionHash = digestSessionToken(activeSessionToken);
  const safePagePath = event === "page_view" && ["/", "/explorar", "/cadastro"].includes(pagePath) ? pagePath : "";
  const safeCategory = event === "explorer_interaction" && ANALYTICS_CATEGORIES.has(category)
    ? category
    : null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const existingSession = await client.query(
      "SELECT expires_at <= CURRENT_TIMESTAMP AS expired FROM analytics_sessions WHERE session_hash = $1 FOR UPDATE",
      [sessionHash]
    );
    if (existingSession.rows[0]?.expired) {
      activeSessionToken = createSessionToken();
      sessionHash = digestSessionToken(activeSessionToken);
    }
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await client.query(
      `INSERT INTO analytics_sessions (session_hash, last_seen_at, expires_at)
       VALUES ($1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (session_hash) DO UPDATE SET
         last_seen_at = CURRENT_TIMESTAMP`,
      [sessionHash, expiresAt]
    );

    if (event === "registration_complete" && userId) {
      await client.query(
        `UPDATE analytics_sessions
         SET registered_user_id = $2, registered_at = CURRENT_TIMESTAMP
         WHERE session_hash = $1 AND registered_user_id IS NULL`,
        [sessionHash, userId]
      );
    }

    await client.query(
      `INSERT INTO analytics_events (session_hash, user_id, event_key, page_path, category)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [sessionHash, userId ?? null, event, safePagePath, safeCategory]
    );
    await client.query("COMMIT");
    return activeSessionToken;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteOldAnalyticsSessions() {
  await pool.query(
    "DELETE FROM analytics_sessions WHERE last_seen_at < CURRENT_TIMESTAMP - INTERVAL '100 days'"
  );
}

export async function getProductionMetrics(rangeKey = "30d") {
  const safeRange = RANGE_MS[rangeKey] ? rangeKey : "30d";
  const now = new Date();
  const baselineResult = await pool.query("SELECT baseline_at FROM analytics_metadata WHERE id = 1");
  const baselineAt = baselineResult.rows[0]?.baseline_at ?? now;
  const requestedFrom = new Date(now.getTime() - RANGE_MS[safeRange]);
  const from = new Date(Math.max(requestedFrom.getTime(), new Date(baselineAt).getTime()));
  const [userResult, activityResult, sessionResult, categoryResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE created_at >= $1)::int AS new_in_range,
              COUNT(*) FILTER (WHERE last_seen_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours')::int AS dau,
              COUNT(*) FILTER (WHERE last_seen_at >= CURRENT_TIMESTAMP - INTERVAL '7 days')::int AS wau,
              COUNT(*) FILTER (WHERE last_seen_at >= CURRENT_TIMESTAMP - INTERVAL '30 days')::int AS mau
       FROM users`,
      [from]
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM tribes WHERE created_at >= $1)::int AS tribes_created,
         (SELECT COUNT(*) FROM tribe_memberships WHERE joined_at >= $1)::int AS memberships_joined,
         (SELECT COUNT(*) FROM feed_items WHERE created_at >= $1 AND kind = 'post')::int AS posts_created,
         (SELECT COUNT(*) FROM feed_items WHERE created_at >= $1 AND kind = 'event')::int AS events_created,
         (SELECT COUNT(*) FROM content_comments WHERE created_at >= $1)::int AS comments_created,
         (SELECT COUNT(*) FROM content_likes WHERE created_at >= $1)::int AS likes_created,
         (SELECT COUNT(*) FROM event_attendees WHERE created_at >= $1)::int AS event_attendances`,
      [from]
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM analytics_sessions WHERE last_seen_at >= $1)::int AS unique_visitors,
         (SELECT COUNT(DISTINCT session_hash) FROM analytics_events
           WHERE event_key = 'page_view' AND page_path = '/' AND created_at >= $1)::int AS landing_views,
         (SELECT COUNT(DISTINCT session_hash) FROM analytics_events
           WHERE event_key = 'hero_cta_click' AND created_at >= $1)::int AS hero_cta_clicks,
         (SELECT COUNT(DISTINCT session_hash) FROM analytics_events
           WHERE event_key = 'explorer_interaction' AND created_at >= $1)::int AS explorer_sessions,
         (SELECT COUNT(DISTINCT session_hash) FROM analytics_events
           WHERE event_key = 'registration_start' AND created_at >= $1)::int AS registration_starts,
         (SELECT COUNT(DISTINCT session_hash) FROM analytics_events
           WHERE event_key = 'page_view' AND page_path = '/cadastro' AND created_at >= $1)::int AS registration_page_views,
         (SELECT COUNT(*) FROM analytics_sessions
           WHERE registered_at >= $1 AND registered_user_id IS NOT NULL)::int AS registration_completions,
         (SELECT COUNT(DISTINCT session_hash) FROM analytics_events
           WHERE event_key = 'page_view' AND page_path = '/explorar' AND created_at >= $1)::int AS explorer_page_views`,
      [from]
    ),
    pool.query(
      `SELECT category, COUNT(DISTINCT session_hash)::int AS visitors
       FROM analytics_events
       WHERE event_key = 'explorer_interaction' AND category IS NOT NULL AND created_at >= $1
       GROUP BY category`,
      [from]
    ),
  ]);

  const users = userResult.rows[0];
  const sessions = sessionResult.rows[0];
  const uniqueVisitors = sessions.unique_visitors;
  const convertedSessions = sessions.registration_completions;
  const interests = Object.fromEntries([...ANALYTICS_CATEGORIES].map((category) => [category, 0]));
  for (const row of categoryResult.rows) interests[row.category] = row.visitors;

  return {
    baselineAtIso: new Date(baselineAt).toISOString(),
    range: { key: safeRange, fromIso: from.toISOString(), toIso: now.toISOString() },
    users: {
      total: users.total,
      newInRange: users.new_in_range,
      active: { dau: users.dau, wau: users.wau, mau: users.mau },
      stickinessPercent: users.mau > 0 ? Number(((users.dau / users.mau) * 100).toFixed(1)) : 0,
    },
    funnel: {
      uniqueVisitors,
      landingViews: sessions.landing_views,
      heroCtaClicks: sessions.hero_cta_clicks,
      explorerPageViews: sessions.explorer_page_views,
      explorerSessions: sessions.explorer_sessions,
      registrationStarts: sessions.registration_starts,
      registrationPageViews: sessions.registration_page_views,
      attributedRegistrations: convertedSessions,
      conversionPercent: uniqueVisitors > 0
        ? Number(((convertedSessions / uniqueVisitors) * 100).toFixed(1))
        : 0,
    },
    interests,
    activity: activityResult.rows[0],
  };
}
