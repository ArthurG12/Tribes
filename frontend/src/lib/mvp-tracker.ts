"use client";

export type AnalyticsEvent =
  | "page_view"
  | "hero_cta_click"
  | "explorer_interaction"
  | "registration_start";

export type MetricsRange = "24h" | "7d" | "30d" | "90d";

export interface ProductionMetrics {
  baselineAtIso: string;
  range: { key: MetricsRange; fromIso: string; toIso: string };
  users: {
    total: number;
    newInRange: number;
    active: { dau: number; wau: number; mau: number };
    stickinessPercent: number;
  };
  funnel: {
    uniqueVisitors: number;
    landingViews: number;
    heroCtaClicks: number;
    explorerPageViews: number;
    explorerSessions: number;
    registrationPageViews: number;
    registrationStarts: number;
    attributedRegistrations: number;
    conversionPercent: number;
  };
  interests: Record<string, number>;
  activity: {
    tribes_created: number;
    memberships_joined: number;
    posts_created: number;
    events_created: number;
    comments_created: number;
    likes_created: number;
    event_attendances: number;
  };
}

let eventQueue: Promise<void> = Promise.resolve();
const queuedSignals = new Map<string, Promise<void>>();

export function trackMvpEvent(payload: {
  event: AnalyticsEvent;
  pagePath?: string;
  category?: string;
}): Promise<void> {
  const signalKey = `${payload.event}:${payload.pagePath ?? ""}:${payload.category ?? ""}`;
  const existing = queuedSignals.get(signalKey);
  if (existing) return existing;

  const send = async () => {
    try {
      const response = await fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!response.ok) queuedSignals.delete(signalKey);
    } catch {
      // Analytics must never block product navigation or actions.
      queuedSignals.delete(signalKey);
    }
  };
  const request = eventQueue.then(send, send);
  eventQueue = request;
  queuedSignals.set(signalKey, request);
  return request;
}

export async function fetchProductionMetrics(range: MetricsRange, signal?: AbortSignal): Promise<Response> {
  return fetch(`/api/admin/metrics?range=${range}`, { cache: "no-store", signal });
}
