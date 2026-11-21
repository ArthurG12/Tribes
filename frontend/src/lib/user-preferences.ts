"use client";

export const FAVORITES_KEY = "tribes-demo-favorites";
export const PROFILE_KEY = "tribes-demo-profile";

export type LocalProfile = { name: string; city: string; bio: string; interests: string[] };

export function readStringList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

export function readProfile(): LocalProfile {
  const fallback = { name: "Participante Tribes", city: "Belo Horizonte", bio: "", interests: [] as string[] };
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<LocalProfile> | null;
    return value ? { ...fallback, ...value, interests: Array.isArray(value.interests) ? value.interests : [] } : fallback;
  } catch { return fallback; }
}

export function writeProfile(profile: LocalProfile) {
  try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); return true; }
  catch { return false; }
}
