"use client";

import type { InterestId, PainPointId, PlanId, SegmentId } from "@/lib/tribes-data";

export type FunnelEventType =
  | "page_view"
  | "hero_cta_click"
  | "explorer_interaction"
  | "plan_select"
  | "waitlist_signup";

export interface LocalWaitlistLead {
  id: string;
  name: string;
  email: string;
  city: string;
  segment: SegmentId;
  selectedPlan?: PlanId;
  interests: InterestId[];
  painPoint?: PainPointId;
  tribePreselected?: string;
  createdAtIso: string;
}

export interface ServerAggregateMetrics {
  startedAtIso: string;
  events: Record<FunnelEventType, number>;
  segments: Record<SegmentId, number>;
  plans: Record<PlanId, number>;
  interests: Record<InterestId, number>;
  pains: Record<PainPointId, number>;
}

const LEADS_STORAGE_KEY = "tribes_mvp_local_leads_v1";
const SESSION_VIEW_KEY = "tribes_mvp_viewed_v1";

export function getLocalLeads(): LocalWaitlistLead[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalLead(lead: LocalWaitlistLead): LocalWaitlistLead[] {
  if (typeof window === "undefined") return [lead];
  const existing = getLocalLeads();
  const updated = [lead, ...existing].slice(0, 200);
  try {
    window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors cleanly
  }
  return updated;
}

export function clearLocalLeads(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEADS_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export async function trackMvpEvent(payload: {
  event: FunnelEventType;
  segment?: SegmentId;
  plan?: PlanId;
  interests?: InterestId[];
  painPoint?: PainPointId;
}): Promise<ServerAggregateMetrics | null> {
  if (typeof window !== "undefined" && payload.event === "page_view") {
    try {
      if (window.sessionStorage.getItem(SESSION_VIEW_KEY) === "1") {
        const res = await fetch("/api/mvp-metrics", { cache: "no-store" });
        if (res.ok) return (await res.json()) as ServerAggregateMetrics;
        return null;
      }
      window.sessionStorage.setItem(SESSION_VIEW_KEY, "1");
    } catch {
      // Continue
    }
  }

  try {
    const response = await fetch("/api/mvp-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { totals?: ServerAggregateMetrics };
    return json.totals ?? null;
  } catch {
    return null;
  }
}

export async function fetchServerMetrics(): Promise<ServerAggregateMetrics | null> {
  try {
    const res = await fetch("/api/mvp-metrics", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ServerAggregateMetrics;
  } catch {
    return null;
  }
}
