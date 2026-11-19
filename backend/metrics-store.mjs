import pg from "pg";

const { Pool } = pg;

export const METRIC_KEYS = {
  events: [
    "page_view",
    "hero_cta_click",
    "explorer_interaction",
    "plan_select",
    "waitlist_signup",
  ],
  segments: ["participante", "organizador", "parceiro"],
  plans: ["explorador", "organizador-plus", "parceiro-local"],
  interests: [
    "esportes",
    "games",
    "rpg",
    "leitura",
    "musica",
    "artes",
    "cultura-geek",
    "programacao",
    "gastronomia",
  ],
  pains: [
    "encontrar-grupos-locais",
    "timidez-integracao",
    "bagunca-whatsapp",
    "grupos-inativos",
    "confirmacao-presenca",
    "falta-companhia",
  ],
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initializeMetricsStore() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mvp_metrics_metadata (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    INSERT INTO mvp_metrics_metadata (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mvp_metric_counters (
      category TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      count BIGINT NOT NULL DEFAULT 0 CHECK (count >= 0),
      PRIMARY KEY (category, metric_key)
    )
  `);

  const counters = Object.entries(METRIC_KEYS).flatMap(([category, keys]) =>
    keys.map((key) => [category, key])
  );
  for (const [category, key] of counters) {
    await pool.query(
      `INSERT INTO mvp_metric_counters (category, metric_key)
       VALUES ($1, $2)
       ON CONFLICT (category, metric_key) DO NOTHING`,
      [category, key]
    );
  }
}

export async function checkDatabase() {
  await pool.query("SELECT 1");
}

async function readMetrics(client) {
  const [{ rows: metadataRows }, { rows: counterRows }] = await Promise.all([
    client.query("SELECT started_at FROM mvp_metrics_metadata WHERE id = 1"),
    client.query("SELECT category, metric_key, count FROM mvp_metric_counters"),
  ]);

  const metrics = {
    startedAtIso: metadataRows[0].started_at.toISOString(),
    events: Object.fromEntries(METRIC_KEYS.events.map((key) => [key, 0])),
    segments: Object.fromEntries(METRIC_KEYS.segments.map((key) => [key, 0])),
    plans: Object.fromEntries(METRIC_KEYS.plans.map((key) => [key, 0])),
    interests: Object.fromEntries(METRIC_KEYS.interests.map((key) => [key, 0])),
    pains: Object.fromEntries(METRIC_KEYS.pains.map((key) => [key, 0])),
  };

  for (const row of counterRows) {
    metrics[row.category][row.metric_key] = Number(row.count);
  }

  return metrics;
}

export async function getMetrics() {
  return readMetrics(pool);
}

export async function recordMetricEvent({ event, segment, plan, interests = [], painPoint }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const counters = [["events", event]];
    if (segment) counters.push(["segments", segment]);
    if (plan) counters.push(["plans", plan]);
    for (const interest of interests) counters.push(["interests", interest]);
    if (painPoint) counters.push(["pains", painPoint]);

    for (const [category, key] of counters) {
      await client.query(
        `INSERT INTO mvp_metric_counters (category, metric_key, count)
         VALUES ($1, $2, 1)
         ON CONFLICT (category, metric_key)
         DO UPDATE SET count = mvp_metric_counters.count + 1`,
        [category, key]
      );
    }

    const metrics = await readMetrics(client);
    await client.query("COMMIT");
    return metrics;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
