"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle, Search, SquarePen } from "lucide-react";
import { UserAvatar } from "@/components/social/user-avatar";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/social-types";

type DirectConversation = {
  id: string;
  peer: { id: string; name: string; avatarUrl: string | null };
  lastMessage: { body: string; createdAt: string } | null;
  unreadCount: number;
};

type DirectUser = { id: string; name: string; avatarUrl: string | null };

function conversationTime(value: string | null) {
  if (!value) return "Nova conversa";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default function DirectMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [users, setUsers] = useState<DirectUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [openingUser, setOpeningUser] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const { conversations: result } = await apiRequest<{ conversations: DirectConversation[] }>("/api/dm/conversations", { cache: "no-store" });
        if (active) {
          setConversations(result);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar suas conversas.");
      } finally {
        fetching = false;
        if (active) {
          setLoading(false);
          timeout = setTimeout(() => void refresh(), 10_000);
        }
      }
    };
    void refresh();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      return;
    }
    let active = true;
    const timeout = window.setTimeout(() => {
      setSearching(true);
      apiRequest<{ users: DirectUser[] }>(`/api/dm/users?q=${encodeURIComponent(normalized)}`, { cache: "no-store" })
        .then(({ users: result }) => { if (active) setUsers(result); })
        .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível buscar pessoas."); })
        .finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query]);

  async function openConversation(recipientId: string) {
    if (openingUser) return;
    setOpeningUser(recipientId);
    setError("");
    try {
      const { conversation } = await apiRequest<{ conversation: { id: string } }>("/api/dm/conversations", {
        method: "POST",
        body: JSON.stringify({ recipientId }),
      });
      router.push(`/mensagens/${conversation.id}`);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Não foi possível abrir a conversa.");
      setOpeningUser(null);
    }
  }

  const normalizedQuery = query.trim();
  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Conexões</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold">Mensagens</h1>
        <p className="mt-1 text-sm text-muted-foreground">Converse diretamente com pessoas da comunidade.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="rounded-3xl border border-border bg-card p-4 shadow-xs sm:p-6" aria-labelledby="new-message-title">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><SquarePen className="size-5" /></span>
          <div>
            <h2 id="new-message-title" className="font-heading text-lg font-bold">Nova conversa</h2>
            <p className="text-sm text-muted-foreground">Busque alguém pelo nome para enviar uma mensagem.</p>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar pessoas"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar pessoas..."
            className="h-11 rounded-xl pl-10"
          />
        </div>
        {normalizedQuery.length > 0 && normalizedQuery.length < 2 && <p className="mt-2 text-xs text-muted-foreground">Digite pelo menos 2 caracteres.</p>}
        {normalizedQuery.length >= 2 && <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {searching ? <div className="flex justify-center p-5"><LoaderCircle className="size-5 animate-spin text-primary" aria-label="Buscando pessoas" /></div> : users.length ? users.map((person) => (
            <button key={person.id} type="button" disabled={openingUser !== null} onClick={() => void openConversation(person.id)} className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60">
              <UserAvatar name={person.name} avatarUrl={person.avatarUrl} className="size-10" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{person.name}</span>
              {openingUser === person.id ? <LoaderCircle className="size-4 animate-spin text-primary" /> : <MessageCircle className="size-4 text-muted-foreground" />}
            </button>
          )) : <p className="p-4 text-center text-sm text-muted-foreground">Ninguém encontrado com esse nome.</p>}
        </div>}
      </section>

      <section aria-labelledby="conversations-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="conversations-title" className="font-heading text-xl font-bold">Suas conversas</h2>
          <span className="text-xs text-muted-foreground">{conversations.length}</span>
        </div>
        {loading ? <div className="flex justify-center rounded-2xl border border-border bg-card py-10"><LoaderCircle className="size-6 animate-spin text-primary" aria-label="Carregando conversas" /></div> : conversations.length ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {conversations.map((conversation) => <Link key={conversation.id} href={`/mensagens/${conversation.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
              <UserAvatar name={conversation.peer.name} avatarUrl={conversation.peer.avatarUrl} className="size-11" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{conversation.peer.name}</span>
                  <time className="shrink-0 text-[11px] text-muted-foreground">{conversationTime(conversation.lastMessage?.createdAt ?? null)}</time>
                </span>
                <span className="mt-1 flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-muted-foreground">{conversation.lastMessage?.body ?? "Inicie uma conversa"}</span>
                  {conversation.unreadCount > 0 && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</span>}
                </span>
              </span>
            </Link>)}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <MessageCircle className="mx-auto size-8 text-primary" />
            <h3 className="mt-3 font-heading text-lg font-bold">Ainda sem conversas</h3>
            <p className="mt-1 text-sm text-muted-foreground">Busque alguém acima para começar a conversar.</p>
          </div>
        )}
      </section>
    </main>
  );
}
