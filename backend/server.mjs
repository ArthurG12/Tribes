import "./load-env.mjs";
import { createServer } from "node:http";
import { readJson, sendJson } from "./http-utils.mjs";
import {
  checkDatabase,
  getMetrics,
  initializeMetricsStore,
  METRIC_KEYS,
  recordMetricEvent,
} from "./metrics-store.mjs";
import { handleSocialRequest } from "./social-api.mjs";
import { initializeSocialStore } from "./social-store.mjs";

const PORT = Number(process.env.PORT ?? 4000);
const MAX_BODY_SIZE = 64 * 1024;

const rateMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();

  if (rateMap.size > 1000) {
    for (const [key, value] of rateMap.entries()) {
      if (now - value.windowStart > 60_000) rateMap.delete(key);
    }
    if (rateMap.size > 1000) return false;
  }

  const existing = rateMap.get(ip);
  if (!existing || now - existing.windowStart > 60_000) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (existing.count >= 120) return false;

  existing.count += 1;
  return true;
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  if (request.method === "GET" && pathname === "/health") {
    try {
      await checkDatabase();
      return sendJson(response, 200, { ok: true });
    } catch {
      return sendJson(response, 503, { ok: false, error: "Banco indisponível." });
    }
  }

  if (pathname !== "/api/mvp-metrics") {
    const handled = await handleSocialRequest(
      request,
      response,
      new URL(request.url ?? "/", "http://localhost")
    );
    if (handled) return;
    return sendJson(response, 404, { error: "Rota não encontrada." });
  }

  if (request.method === "GET") {
    try {
      return sendJson(response, 200, await getMetrics());
    } catch (error) {
      console.error("Falha ao consultar métricas:", error);
      return sendJson(response, 503, { error: "Não foi possível consultar as métricas." });
    }
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Método não permitido." }, { Allow: "GET, POST" });
  }

  const forwardedIp = request.headers["x-forwarded-for"]?.split(",")[0]?.trim();
  const clientIp = (forwardedIp ?? request.socket.remoteAddress ?? "local").slice(0, 64);
  if (!checkRateLimit(clientIp)) {
    return sendJson(response, 429, {
      error: "Muitas requisições em sequência. Tente novamente em instantes.",
    });
  }

  let payload;
  try {
    payload = await readJson(request, {
      maxSize: MAX_BODY_SIZE,
      requireObject: false,
      invalidMessage: "Payload JSON inválido.",
    });
  } catch (error) {
    return sendJson(response, error.statusCode ?? 400, {
      error: error.message ?? "Payload JSON inválido.",
    });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return sendJson(response, 400, { error: "Objeto esperado." });
  }
  if (typeof payload.event !== "string" || !METRIC_KEYS.events.includes(payload.event)) {
    return sendJson(response, 400, { error: "Tipo de evento não permitido." });
  }

  const event = payload.event;
  const metricEvent = {
    event,
    segment:
    typeof payload.segment === "string" &&
    METRIC_KEYS.segments.includes(payload.segment) &&
    event === "waitlist_signup"
      ? payload.segment
      : undefined,
    plan:
    typeof payload.plan === "string" &&
    METRIC_KEYS.plans.includes(payload.plan) &&
    ["plan_select", "waitlist_signup"].includes(event)
      ? payload.plan
      : undefined,
    interests: Array.isArray(payload.interests)
      ? [...new Set(payload.interests)].filter(
          (interest) => typeof interest === "string" && METRIC_KEYS.interests.includes(interest)
        )
      : [],
    painPoint:
    typeof payload.painPoint === "string" &&
    METRIC_KEYS.pains.includes(payload.painPoint) &&
    event === "waitlist_signup"
      ? payload.painPoint
      : undefined,
  };

  try {
    const totals = await recordMetricEvent(metricEvent);
    return sendJson(response, 200, { ok: true, totals });
  } catch (error) {
    console.error("Falha ao registrar métrica:", error);
    return sendJson(response, 503, { error: "Não foi possível registrar a métrica." });
  }
});

Promise.all([initializeMetricsStore(), initializeSocialStore()])
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Tribes backend listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Falha ao inicializar o backend:", error);
    process.exit(1);
  });
