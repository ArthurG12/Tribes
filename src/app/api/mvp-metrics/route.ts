import { NextRequest, NextResponse } from "next/server";
import type { InterestId, PainPointId, PlanId, SegmentId } from "@/lib/tribes-data";

const ALLOWED_EVENTS = [
  "page_view",
  "hero_cta_click",
  "explorer_interaction",
  "plan_select",
  "waitlist_signup",
] as const;

const ALLOWED_SEGMENTS: SegmentId[] = ["participante", "organizador", "parceiro"];

const ALLOWED_PLANS: PlanId[] = ["explorador", "organizador-plus", "parceiro-local"];

const ALLOWED_INTERESTS: InterestId[] = [
  "esportes",
  "games",
  "rpg",
  "leitura",
  "musica",
  "artes",
  "cultura-geek",
  "programacao",
  "gastronomia",
];

const ALLOWED_PAINS: PainPointId[] = [
  "encontrar-grupos-locais",
  "timidez-integracao",
  "bagunca-whatsapp",
  "grupos-inativos",
  "confirmacao-presenca",
  "falta-companhia",
];

type EventType = (typeof ALLOWED_EVENTS)[number];

interface AggregateMetricsState {
  startedAtIso: string;
  events: Record<EventType, number>;
  segments: Record<SegmentId, number>;
  plans: Record<PlanId, number>;
  interests: Record<InterestId, number>;
  pains: Record<PainPointId, number>;
}

const globalForMetrics = globalThis as unknown as {
  __tribesMvpMetrics?: AggregateMetricsState;
  __tribesRateMap?: Map<string, { count: number; windowStart: number }>;
};

function createInitialState(): AggregateMetricsState {
  return {
    startedAtIso: new Date().toISOString(),
    events: {
      page_view: 0,
      hero_cta_click: 0,
      explorer_interaction: 0,
      plan_select: 0,
      waitlist_signup: 0,
    },
    segments: {
      participante: 0,
      organizador: 0,
      parceiro: 0,
    },
    plans: {
      explorador: 0,
      "organizador-plus": 0,
      "parceiro-local": 0,
    },
    interests: {
      esportes: 0,
      games: 0,
      rpg: 0,
      leitura: 0,
      musica: 0,
      artes: 0,
      "cultura-geek": 0,
      programacao: 0,
      gastronomia: 0,
    },
    pains: {
      "encontrar-grupos-locais": 0,
      "timidez-integracao": 0,
      "bagunca-whatsapp": 0,
      "grupos-inativos": 0,
      "confirmacao-presenca": 0,
      "falta-companhia": 0,
    },
  };
}

function getState(): AggregateMetricsState {
  if (!globalForMetrics.__tribesMvpMetrics) {
    globalForMetrics.__tribesMvpMetrics = createInitialState();
  }
  return globalForMetrics.__tribesMvpMetrics;
}

function checkRateLimit(ip: string): boolean {
  if (!globalForMetrics.__tribesRateMap) {
    globalForMetrics.__tribesRateMap = new Map();
  }
  const map = globalForMetrics.__tribesRateMap;
  const now = Date.now();
  if (map.size > 1000) {
    for (const [key, val] of map.entries()) {
      if (now - val.windowStart > 60_000) {
        map.delete(key);
      }
    }
    if (map.size > 1000) {
      return false;
    }
  }
  const existing = map.get(ip);
  if (!existing || now - existing.windowStart > 60_000) {
    map.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (existing.count >= 120) {
    return false;
  }
  existing.count += 1;
  return true;
}

export async function GET() {
  const state = getState();
  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",")[0].trim().slice(0, 64) : "local";

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Muitas requisições em sequência. Tente novamente em instantes." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Objeto esperado." }, { status: 400 });
  }

  const payload = body as {
    event?: unknown;
    segment?: unknown;
    plan?: unknown;
    interests?: unknown;
    painPoint?: unknown;
  };

  if (
    typeof payload.event !== "string" ||
    !(ALLOWED_EVENTS as readonly string[]).includes(payload.event)
  ) {
    return NextResponse.json({ error: "Tipo de evento não permitido." }, { status: 400 });
  }

  const event = payload.event as EventType;
  const state = getState();
  state.events[event] += 1;

  if (
    typeof payload.segment === "string" &&
    (ALLOWED_SEGMENTS as readonly string[]).includes(payload.segment) &&
    event === "waitlist_signup"
  ) {
    state.segments[payload.segment as SegmentId] += 1;
  }

  if (
    typeof payload.plan === "string" &&
    (ALLOWED_PLANS as readonly string[]).includes(payload.plan) &&
    (event === "plan_select" || event === "waitlist_signup")
  ) {
    state.plans[payload.plan as PlanId] += 1;
  }

  if (Array.isArray(payload.interests)) {
    const uniqueInterests = Array.from(new Set(payload.interests)).slice(0, 9);
    for (const item of uniqueInterests) {
      if (typeof item === "string" && (ALLOWED_INTERESTS as readonly string[]).includes(item)) {
        state.interests[item as InterestId] += 1;
      }
    }
  }

  if (
    typeof payload.painPoint === "string" &&
    (ALLOWED_PAINS as readonly string[]).includes(payload.painPoint) &&
    event === "waitlist_signup"
  ) {
    state.pains[payload.painPoint as PainPointId] += 1;
  }

  return NextResponse.json({ ok: true, totals: state });
}
