export interface SocialUser {
  id: string;
  name: string;
  email: string;
  aboutMe: string;
  avatarUrl: string | null;
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
  type: "post" | "event" | "poll";
  body: string;
  imageUrl: string | null;
  createdAt: string;
  editedAt: string | null;
  author: { id: string; name: string; avatarUrl: string | null };
  tribe: { id: string; name: string };
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  poll: null | { options: { id: string; label: string; votes: number }[]; totalVotes: number; votedOptionId: string | null };
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
  author: { id: string; name: string; avatarUrl: string | null };
}

export interface PublicProfile {
  id: string;
  name: string;
  aboutMe: string;
  city: string;
  interests: string[];
  avatarUrl: string | null;
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
