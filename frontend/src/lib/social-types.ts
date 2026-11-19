export interface SocialUser {
  id: string;
  name: string;
  email: string;
}

export interface Tribe {
  id: string;
  name: string;
  description: string;
  category: string;
  format: "Presencial" | "Híbrido" | "Online";
  city: string;
  neighborhood: string;
  createdAt: string;
  memberCount: number;
  isMember: boolean;
}

export interface FeedItem {
  id: string;
  type: "post" | "event";
  body: string;
  imageUrl: string | null;
  createdAt: string;
  editedAt: string | null;
  author: { id: string; name: string };
  tribe: { id: string; name: string };
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  event: null | {
    title: string;
    startsAt: string;
    endsAt: string | null;
    location: string;
    cost: string;
    maxAttendees: number | null;
    attendeesCount: number;
    attendingByMe: boolean;
  };
}

export interface FeedComment {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  isMine: boolean;
  author: { id: string; name: string };
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível completar a solicitação.");
  return payload as T;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
