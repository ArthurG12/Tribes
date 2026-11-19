"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  Heart,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, formatDateTime, type FeedComment, type FeedItem, type Tribe } from "@/lib/social-types";

const PAGE_SIZE = 20;

export default function FeedPage() {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribe, setSelectedTribe] = useState("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTribe, setComposerTribe] = useState("");
  const [postBody, setPostBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [eventMode, setEventMode] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCost, setEventCost] = useState("");
  const [eventCapacity, setEventCapacity] = useState("");
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentError, setCommentError] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [attendancePending, setAttendancePending] = useState<Record<string, boolean>>({});

  const fetchPage = useCallback(async (cursor?: string, replace = false) => {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (selectedTribe !== "all") query.set("tribeId", selectedTribe);
    if (cursor) query.set("cursor", cursor);
    const result = await apiRequest<{ items: FeedItem[]; nextCursor: string | null }>(`/api/feed?${query}`);
    setItems((existing) => replace ? result.items : [...existing, ...result.items]);
    setNextCursor(result.nextCursor);
  }, [selectedTribe]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ tribes: joined }] = await Promise.all([
        apiRequest<{ tribes: Tribe[] }>("/api/tribes?mine=true"),
      ]);
      setTribes(joined);
      setComposerTribe((current) => current && joined.some((tribe) => tribe.id === current) ? current : joined[0]?.id ?? "");
      setItems([]);
      setNextCursor(null);
      await fetchPage(undefined, true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o feed.");
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => { void loadInitial(); }, [loadInitial]);

  async function submitContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!composerTribe) return;
    setCreating(true);
    setError("");
    try {
      if (eventMode) {
        const payload = {
          body: postBody,
          title: eventTitle,
          startsAt: new Date(eventStartsAt).toISOString(),
          endsAt: eventEndsAt ? new Date(eventEndsAt).toISOString() : null,
          location: eventLocation,
          cost: eventCost,
          maxAttendees: eventCapacity ? Number(eventCapacity) : null,
        };
        await apiRequest(`/api/tribes/${composerTribe}/events`, { method: "POST", body: JSON.stringify(payload) });
      } else {
        await apiRequest(`/api/tribes/${composerTribe}/posts`, { method: "POST", body: JSON.stringify({ body: postBody }) });
      }
      setPostBody("");
      setEventTitle("");
      setEventStartsAt("");
      setEventEndsAt("");
      setEventLocation("");
      setEventCost("");
      setEventCapacity("");
      await fetchPage(undefined, true);
      setComposerOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível publicar.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleLike(item: FeedItem) {
    const method = item.likedByMe ? "DELETE" : "POST";
    try {
      const result = await apiRequest<{ likesCount: number; likedByMe: boolean }>(`/api/content/${item.id}/like`, { method });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...result } : entry));
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : "Não foi possível atualizar a curtida.");
    }
  }

  async function toggleAttendance(item: FeedItem) {
    if (!item.event || attendancePending[item.id]) return;
    setAttendancePending((current) => ({ ...current, [item.id]: true }));
    try {
      const method = item.event.attendingByMe ? "DELETE" : "POST";
      const result = await apiRequest<{ attendeesCount: number; attendingByMe: boolean }>(`/api/content/${item.id}/attendance`, { method });
      setItems((current) => current.map((entry) => entry.id === item.id && entry.event
        ? { ...entry, event: { ...entry.event, ...result } }
        : entry));
    } catch (attendanceError) {
      setError(attendanceError instanceof Error ? attendanceError.message : "Não foi possível atualizar sua presença.");
    } finally {
      setAttendancePending((current) => ({ ...current, [item.id]: false }));
    }
  }

  async function toggleComments(itemId: string) {
    const willOpen = !expandedComments[itemId];
    setExpandedComments((current) => ({ ...current, [itemId]: willOpen }));
    if (willOpen && !comments[itemId]) {
      try {
        const result = await apiRequest<{ comments: FeedComment[] }>(`/api/content/${itemId}/comments`);
        setComments((current) => ({ ...current, [itemId]: result.comments }));
      } catch (commentsLoadError) {
        setCommentError((current) => ({ ...current, [itemId]: commentsLoadError instanceof Error ? commentsLoadError.message : "Erro ao carregar comentários." }));
      }
    }
  }

  async function submitComment(itemId: string) {
    const body = commentDrafts[itemId]?.trim();
    if (!body) return;
    try {
      const result = await apiRequest<{ comment: FeedComment }>(`/api/content/${itemId}/comments`, { method: "POST", body: JSON.stringify({ body }) });
      setComments((current) => ({ ...current, [itemId]: [...(current[itemId] ?? []), result.comment] }));
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, commentsCount: item.commentsCount + 1 } : item));
      setCommentDrafts((current) => ({ ...current, [itemId]: "" }));
    } catch (submitError) {
      setCommentError((current) => ({ ...current, [itemId]: submitError instanceof Error ? submitError.message : "Não foi possível comentar." }));
    }
  }

  async function saveComment(commentId: string, itemId: string) {
    try {
      const result = await apiRequest<{ comment: FeedComment }>(`/api/comments/${commentId}`, { method: "PATCH", body: JSON.stringify({ body: editDraft }) });
      setComments((current) => ({ ...current, [itemId]: current[itemId].map((comment) => comment.id === commentId ? { ...comment, body: result.comment.body, editedAt: result.comment.editedAt ?? new Date().toISOString() } : comment) }));
      setEditingComment(null);
    } catch (editError) {
      setCommentError((current) => ({ ...current, [itemId]: editError instanceof Error ? editError.message : "Não foi possível editar." }));
    }
  }

  async function removeComment(commentId: string, itemId: string) {
    try {
      await apiRequest(`/api/comments/${commentId}`, { method: "DELETE" });
      setComments((current) => ({ ...current, [itemId]: current[itemId].filter((comment) => comment.id !== commentId) }));
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, commentsCount: Math.max(0, item.commentsCount - 1) } : item));
    } catch (removeError) {
      setCommentError((current) => ({ ...current, [itemId]: removeError instanceof Error ? removeError.message : "Não foi possível remover." }));
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge className="bg-primary/10 text-primary">Sua comunidade</Badge>
            <h1 className="mt-2 font-heading text-3xl font-extrabold">Feed das suas tribos</h1>
            <p className="mt-1 text-sm text-muted-foreground">Publicações e eventos, em ordem cronológica.</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" render={<Link href="/tribos" />}><Users className="size-4" />Explorar</Button>
            <Button variant="outline" onClick={() => setComposerOpen(true)}><Send className="size-4" />Publicar</Button>
            <Button variant="outline" render={<Link href="/tribos/nova" />}><Plus className="size-4" />Criar tribo</Button>
          </div>
        </section>

        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">Compartilhe com sua tribo</DialogTitle>
            <DialogDescription>Publique uma novidade ou crie um evento para os membros da sua tribo.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(event) => void submitContent(event)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <button type="button" onClick={() => setEventMode(false)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!eventMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Publicação</button>
                <button type="button" onClick={() => setEventMode(true)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${eventMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Evento</button>
              </div>
            </div>
            <select aria-label="Tribo onde publicar" value={composerTribe} onChange={(event) => setComposerTribe(event.target.value)} required disabled={!tribes.length}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {tribes.length ? tribes.map((tribe) => <option key={tribe.id} value={tribe.id}>{tribe.name}</option>) : <option value="">Entre em uma tribo para publicar</option>}
            </select>
            {eventMode && <div className="grid gap-3 sm:grid-cols-2">
              <Input aria-label="Título do evento" placeholder="Título do evento" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} required />
              <Input aria-label="Local do evento" placeholder="Local" value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} required />
              <Input aria-label="Início do evento" type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} required />
              <Input aria-label="Término do evento" type="datetime-local" value={eventEndsAt} onChange={(event) => setEventEndsAt(event.target.value)} />
              <Input aria-label="Custo do evento" placeholder="Custo (opcional)" value={eventCost} onChange={(event) => setEventCost(event.target.value)} />
              <Input aria-label="Limite de participantes" type="number" min="1" placeholder="Limite de participantes" value={eventCapacity} onChange={(event) => setEventCapacity(event.target.value)} />
            </div>}
            <Textarea placeholder={eventMode ? "Conte um pouco sobre o evento..." : "O que está acontecendo na sua tribo?"} value={postBody} onChange={(event) => setPostBody(event.target.value)} maxLength={5000} required />
            {!tribes.length && <p className="text-sm text-muted-foreground">Entre em uma tribo antes de publicar.</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={creating || !tribes.length || !postBody.trim()} className="rounded-xl">
                {creating ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                {eventMode ? "Publicar evento" : "Publicar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <label htmlFor="tribe-filter" className="mb-2 block text-sm font-semibold">Filtrar feed</label>
        <select id="tribe-filter" value={selectedTribe} onChange={(event) => setSelectedTribe(event.target.value)}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="all">Todas as tribos</option>
          {tribes.map((tribe) => <option key={tribe.id} value={tribe.id}>{tribe.name}</option>)}
        </select>
      </section>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><LoaderCircle className="size-6 animate-spin text-primary" /></div> : items.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users className="size-6" /></div>
          <h2 className="mt-4 font-heading text-xl font-bold">{tribes.length ? "Seu feed está começando" : "Encontre sua primeira tribo"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{tribes.length ? "Quando alguém publicar ou criar um evento, ele aparecerá aqui." : "Explore comunidades por interesse ou crie uma nova para começar a compartilhar."}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button render={<Link href="/tribos" />}>Buscar tribos</Button>
            <Button variant="outline" render={<Link href="/tribos/nova" />}>Criar tribo</Button>
          </div>
        </section>
      ) : <div className="space-y-4">
        {items.map((item) => <article key={item.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
          <header className="flex items-start justify-between gap-3 border-b border-border/70 p-4 sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-heading font-bold text-primary">{item.author.name.trim().slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-bold">{item.author.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">em <span className="font-semibold text-foreground/80">{item.tribe.name}</span> · {formatDateTime(item.createdAt)}{item.editedAt ? " · editado" : ""}</p>
              </div>
            </div>
            <Badge variant={item.type === "event" ? "default" : "secondary"}>{item.type === "event" ? "Evento" : "Publicação"}</Badge>
          </header>
          <div className="space-y-4 p-4 sm:p-5">
            {item.event && <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><CalendarDays className="size-4" />Evento da tribo</div>
              <h2 className="mt-2 font-heading text-lg font-bold">{item.event.title}</h2>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p className="flex items-center gap-2"><Clock3 className="size-4 shrink-0 text-primary" />{formatDateTime(item.event.startsAt)}{item.event.endsAt ? ` – ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(item.event.endsAt))}` : ""}</p>
                <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-primary" />{item.event.location}</p>
                {item.event.cost && <p>{item.event.cost}</p>}
                {item.event.maxAttendees && <p className="flex items-center gap-2"><Users className="size-4 text-primary" />Limite de {item.event.maxAttendees} participantes</p>}
              </div>
            </div>}
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
              <Button type="button" size="sm" variant="ghost" aria-pressed={item.likedByMe} onClick={() => void toggleLike(item)} className={item.likedByMe ? "text-primary" : "text-muted-foreground"}>
                <Heart className={`size-4 ${item.likedByMe ? "fill-current" : ""}`} />{item.likesCount} {item.likesCount === 1 ? "curtida" : "curtidas"}
              </Button>
              <Button type="button" size="sm" variant="ghost" aria-expanded={Boolean(expandedComments[item.id])} onClick={() => void toggleComments(item.id)} className="text-muted-foreground">
                <MessageCircle className="size-4" />{item.commentsCount} {item.commentsCount === 1 ? "comentário" : "comentários"}
              </Button>
              {item.event && <Button type="button" size="sm" variant="ghost" aria-pressed={item.event.attendingByMe} disabled={Boolean(attendancePending[item.id])} onClick={() => void toggleAttendance(item)} className={item.event.attendingByMe ? "text-primary" : "text-muted-foreground"}>
                <Users className="size-4" />{item.event.attendingByMe ? "Presença confirmada" : "Confirmar presença"} · {item.event.attendeesCount}
              </Button>}
            </div>
            {expandedComments[item.id] && <div className="space-y-3 border-t border-border/70 pt-3">
              {(comments[item.id] ?? []).map((comment) => <div key={comment.id} className="rounded-xl bg-muted/55 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold">{comment.author.name}{comment.editedAt ? <span className="font-normal text-muted-foreground"> · editado</span> : null}</span>
                  <time className="text-muted-foreground">{formatDateTime(comment.createdAt)}</time>
                </div>
                {editingComment === comment.id ? <div className="mt-2 space-y-2"><Textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} maxLength={2000} /><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEditingComment(null)}>Cancelar</Button><Button size="sm" onClick={() => void saveComment(comment.id, item.id)}>Salvar</Button></div></div> : <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">{comment.body}</p>}
                {comment.isMine && editingComment !== comment.id && <div className="mt-2 flex gap-3 text-xs"><button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setEditingComment(comment.id); setEditDraft(comment.body); }}>Editar</button><button type="button" className="font-semibold text-destructive hover:underline" onClick={() => void removeComment(comment.id, item.id)}>Remover</button></div>}
              </div>)}
              {commentError[item.id] && <p role="alert" className="text-xs text-destructive">{commentError[item.id]}</p>}
              <div className="flex gap-2"><Input aria-label="Escreva um comentário" value={commentDrafts[item.id] ?? ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={2000} placeholder="Escreva um comentário..." onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitComment(item.id); } }} /><Button type="button" aria-label="Enviar comentário" disabled={!commentDrafts[item.id]?.trim()} onClick={() => void submitComment(item.id)}><Send className="size-4" /></Button></div>
            </div>}
          </div>
        </article>)}
      </div>}
      {!loading && nextCursor && <div className="flex justify-center"><Button variant="outline" disabled={loadingMore} onClick={async () => { setLoadingMore(true); try { await fetchPage(nextCursor); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Erro ao carregar mais itens."); } finally { setLoadingMore(false); } }}>{loadingMore && <LoaderCircle className="size-4 animate-spin" />}Carregar mais</Button></div>}
    </main>
  );
}
