"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  CalendarDays,
  Clock3,
  Heart,
  MapPin,
  MessageCircle,
  BarChart3,
  Send,
  Users,
  Pencil,
  Trash2,
  Share2,
} from "lucide-react";
import { UserAvatar } from "@/components/social/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, formatDateTime, type FeedComment, type FeedItem } from "@/lib/social-types";

interface FeedItemCardProps {
  item: FeedItem;
  onUpdateItem: (itemId: string, update: (current: FeedItem) => FeedItem) => void;
  onError: (message: string) => void;
  onRemoveItem: (itemId: string) => void;
}

export function FeedItemCard({ item, onUpdateItem, onError, onRemoveItem }: FeedItemCardProps) {
  const [expandedComments, setExpandedComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [attendancePending, setAttendancePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [votePending, setVotePending] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostBody, setEditPostBody] = useState(item.body);
  const [postPending, setPostPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function savePost() {
    const body = editPostBody.trim();
    if (!body || postPending) return;
    setPostPending(true);
    try {
      const result = await apiRequest<{ item: { body: string; editedAt: string } }>(`/api/content/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ body }),
      });
      onUpdateItem(item.id, (current) => ({ ...current, body: result.item.body, editedAt: result.item.editedAt }));
      setEditingPost(false);
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Não foi possível editar a publicação.");
    } finally {
      setPostPending(false);
    }
  }

  async function removePost() {
    if (postPending) return;
    setPostPending(true);
    try {
      await apiRequest(`/api/content/${item.id}`, { method: "DELETE" });
      onRemoveItem(item.id);
    } catch (removeError) {
      onError(removeError instanceof Error ? removeError.message : "Não foi possível excluir a publicação.");
    } finally {
      setPostPending(false);
      setConfirmDelete(false);
    }
  }

  async function sharePost() {
    const url = `${window.location.origin}/feed?focus=${item.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Tribes", url });
      else {
        await navigator.clipboard.writeText(url);
        onError("Link copiado para compartilhar.");
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name !== "AbortError") onError("Não foi possível compartilhar este link.");
    }
  }

  async function toggleLike() {
    const method = item.likedByMe ? "DELETE" : "POST";
    try {
      const result = await apiRequest<{ likesCount: number; likedByMe: boolean }>(`/api/content/${item.id}/like`, { method });
      onUpdateItem(item.id, (current) => ({ ...current, ...result }));
    } catch (likeError) {
      onError(likeError instanceof Error ? likeError.message : "Não foi possível atualizar a curtida.");
    }
  }

  async function toggleSaved() {
    if (savePending) return;
    setSavePending(true);
    try {
      const method = item.savedByMe ? "DELETE" : "POST";
      const result = await apiRequest<{ savedByMe: boolean }>(`/api/content/${item.id}/save`, { method });
      onUpdateItem(item.id, (current) => ({ ...current, ...result }));
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Não foi possível atualizar os salvos.");
    } finally {
      setSavePending(false);
    }
  }

  async function toggleAttendance() {
    if (!item.event || attendancePending) return;
    setAttendancePending(true);
    try {
      const method = item.event.attendingByMe ? "DELETE" : "POST";
      const result = await apiRequest<{ attendeesCount: number; attendingByMe: boolean; waitlistCount: number; waitlistedByMe: boolean }>(`/api/content/${item.id}/attendance`, { method });
      onUpdateItem(item.id, (current) => current.event
        ? { ...current, event: { ...current.event, ...result } }
        : current);
    } catch (attendanceError) {
      onError(attendanceError instanceof Error ? attendanceError.message : "Não foi possível atualizar sua presença.");
    } finally {
      setAttendancePending(false);
    }
  }

  async function toggleComments() {
    const willOpen = !expandedComments;
    setExpandedComments(willOpen);
    if (willOpen && comments === null) {
      try {
        const result = await apiRequest<{ comments: FeedComment[] }>(`/api/content/${item.id}/comments`);
        setComments(result.comments);
      } catch (loadError) {
        setCommentError(loadError instanceof Error ? loadError.message : "Erro ao carregar comentários.");
      }
    }
  }

  async function submitComment() {
    const body = commentDraft.trim();
    if (!body) return;
    try {
      const result = await apiRequest<{ comment: FeedComment }>(`/api/content/${item.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setComments((current) => [...(current ?? []), result.comment]);
      onUpdateItem(item.id, (current) => ({ ...current, commentsCount: current.commentsCount + 1 }));
      setCommentDraft("");
      setCommentError("");
    } catch (submitError) {
      setCommentError(submitError instanceof Error ? submitError.message : "Não foi possível comentar.");
    }
  }

  async function saveComment(commentId: string) {
    try {
      const result = await apiRequest<{ comment: FeedComment }>(`/api/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({ body: editDraft }),
      });
      setComments((current) => (current ?? []).map((comment) => comment.id === commentId
        ? { ...comment, body: result.comment.body, editedAt: result.comment.editedAt ?? new Date().toISOString() }
        : comment));
      setEditingComment(null);
      setCommentError("");
    } catch (editError) {
      setCommentError(editError instanceof Error ? editError.message : "Não foi possível editar.");
    }
  }

  async function removeComment(commentId: string) {
    try {
      await apiRequest(`/api/comments/${commentId}`, { method: "DELETE" });
      setComments((current) => (current ?? []).filter((comment) => comment.id !== commentId));
      onUpdateItem(item.id, (current) => ({ ...current, commentsCount: Math.max(0, current.commentsCount - 1) }));
      setCommentError("");
    } catch (removeError) {
      setCommentError(removeError instanceof Error ? removeError.message : "Não foi possível remover.");
    }
  }

  return (
    <article id={`feed-item-${item.id}`} className="scroll-mt-28 overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
      <header className="flex items-start justify-between gap-3 border-b border-border/70 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/usuarios/${item.author.id}`} aria-label={`Ver perfil de ${item.author.name}`}>
            <UserAvatar name={item.author.name} avatarUrl={item.author.avatarUrl} />
          </Link>
          <div className="min-w-0">
            <Link href={`/usuarios/${item.author.id}`} className="truncate font-heading text-sm font-bold hover:text-primary">{item.author.name}</Link>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">em <span className="font-semibold text-foreground/80">{item.tribe.name}</span> · {formatDateTime(item.createdAt)}{item.editedAt ? " · editado" : ""}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={item.type === "event" ? "default" : "secondary"}>{item.type === "event" ? "Evento" : item.type === "poll" ? "Enquete" : "Publicação"}</Badge>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Compartilhar publicação" onClick={() => void sharePost()}><Share2 className="size-4" /></Button>
          {item.isMine && <Button type="button" size="icon-sm" variant="ghost" aria-label="Editar publicação" onClick={() => { setEditPostBody(item.body); setEditingPost(true); }}><Pencil className="size-4" /></Button>}
          {item.isMine && <Button type="button" size="icon-sm" variant="ghost" aria-label="Excluir publicação" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4 text-destructive" /></Button>}
        </div>
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
        {editingPost ? <div className="space-y-2">
          <Textarea value={editPostBody} onChange={(event) => setEditPostBody(event.target.value)} maxLength={5000} rows={4} />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingPost(false)}>Cancelar</Button>
            <Button type="button" size="sm" disabled={postPending || !editPostBody.trim()} onClick={() => void savePost()}>{postPending ? <LoaderCircle className="size-4 animate-spin" /> : null}Salvar</Button>
          </div>
        </div> : <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>}
        {confirmDelete && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm">Excluir esta publicação permanentemente?</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button type="button" size="sm" variant="destructive" disabled={postPending} onClick={() => void removePost()}>{postPending ? <LoaderCircle className="size-4 animate-spin" /> : "Excluir"}</Button>
          </div>
        </div>}
        {item.poll && <section className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><BarChart3 className="size-4" />Enquete · {item.poll.totalVotes} {item.poll.totalVotes === 1 ? "voto" : "votos"}</div>
          <div className="space-y-2">
            {item.poll.options.map((option) => {
              const percentage = item.poll!.totalVotes ? Math.round(option.votes / item.poll!.totalVotes * 100) : 0;
              const selected = item.poll!.votedOptionId === option.id;
              return <button key={option.id} type="button" disabled={votePending} onClick={() => {
                setVotePending(true);
                void apiRequest<{ totalVotes: number; votedOptionId: string }>(`/api/content/${item.id}/vote`, { method: "POST", body: JSON.stringify({ optionId: option.id }) })
                  .then((result) => onUpdateItem(item.id, (current) => current.poll ? { ...current, poll: { ...current.poll, totalVotes: result.totalVotes, votedOptionId: result.votedOptionId, options: current.poll.options.map((entry) => ({ ...entry, votes: entry.id === option.id ? entry.votes + (selected ? 0 : 1) : entry.id === current.poll!.votedOptionId ? Math.max(0, entry.votes - 1) : entry.votes })) } } : current))
                  .catch((error: unknown) => onError(error instanceof Error ? error.message : "Não foi possível registrar seu voto."))
                  .finally(() => setVotePending(false));
              }} className={`relative w-full overflow-hidden rounded-xl border px-3 py-3 text-left text-sm ${selected ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                <span className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${percentage}%` }} />
                <span className="relative flex items-center justify-between gap-3"><span className="font-medium">{option.label}</span><span className="shrink-0 text-xs text-muted-foreground">{percentage}% · {option.votes}</span></span>
              </button>;
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{item.poll.votedOptionId ? "Você pode alterar seu voto." : "Escolha uma opção para votar."}</p>
        </section>}
        {item.imageUrl && <Image src={item.imageUrl} alt={`Imagem da publicação de ${item.author.name}`} width={1200} height={900} unoptimized className="max-h-[32rem] w-full rounded-2xl bg-muted/30 object-contain" />}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
          <Button type="button" size="sm" variant="ghost" aria-pressed={item.savedByMe} disabled={savePending} onClick={() => void toggleSaved()} className={item.savedByMe ? "text-primary" : "text-muted-foreground"}>
            <Bookmark className={`size-4 ${item.savedByMe ? "fill-current" : ""}`} />{item.savedByMe ? "Salva" : "Salvar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" aria-pressed={item.likedByMe} onClick={() => void toggleLike()} className={item.likedByMe ? "text-primary" : "text-muted-foreground"}>
            <Heart className={`size-4 ${item.likedByMe ? "fill-current" : ""}`} />{item.likesCount} {item.likesCount === 1 ? "curtida" : "curtidas"}
          </Button>
          <Button type="button" size="sm" variant="ghost" aria-expanded={expandedComments} onClick={() => void toggleComments()} className="text-muted-foreground">
            <MessageCircle className="size-4" />{item.commentsCount} {item.commentsCount === 1 ? "comentário" : "comentários"}
          </Button>
          {item.event && <Button type="button" size="sm" variant="ghost" aria-pressed={item.event.attendingByMe} disabled={attendancePending} onClick={() => void toggleAttendance()} className={item.event.attendingByMe ? "text-primary" : "text-muted-foreground"}>
            <Users className="size-4" />{item.event.attendingByMe ? "Presença confirmada" : item.event.waitlistedByMe ? "Na lista de espera" : "Confirmar presença"} · {item.event.attendeesCount}{item.event.maxAttendees ? `/${item.event.maxAttendees}` : ""}{item.event.waitlistCount ? ` · ${item.event.waitlistCount} na espera` : ""}
          </Button>}
        </div>
        {expandedComments && <div className="space-y-3 border-t border-border/70 pt-3">
          {(comments ?? []).map((comment) => <div key={comment.id} className="rounded-xl bg-muted/55 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <Link href={`/usuarios/${comment.author.id}`} aria-label={`Ver perfil de ${comment.author.name}`}>
                  <UserAvatar name={comment.author.name} avatarUrl={comment.author.avatarUrl} className="size-7 text-[10px]" />
                </Link>
                <span className="min-w-0">
                  <Link href={`/usuarios/${comment.author.id}`} className="font-semibold hover:text-primary">{comment.author.name}</Link>{comment.editedAt ? <span className="font-normal text-muted-foreground"> · editado</span> : null}
                </span>
              </div>
              <time className="text-muted-foreground">{formatDateTime(comment.createdAt)}</time>
            </div>
            {editingComment === comment.id
              ? <div className="mt-2 space-y-2"><Textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} maxLength={2000} /><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setEditingComment(null)}>Cancelar</Button><Button size="sm" onClick={() => void saveComment(comment.id)}>Salvar</Button></div></div>
              : <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">{comment.body}</p>}
            {comment.isMine && editingComment !== comment.id && <div className="mt-2 flex gap-3 text-xs"><button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setEditingComment(comment.id); setEditDraft(comment.body); }}>Editar</button><button type="button" className="font-semibold text-destructive hover:underline" onClick={() => void removeComment(comment.id)}>Remover</button></div>}
          </div>)}
          {commentError && <p role="alert" className="text-xs text-destructive">{commentError}</p>}
          <div className="flex gap-2"><Input aria-label="Escreva um comentário" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} maxLength={2000} placeholder="Escreva um comentário..." onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitComment(); } }} /><Button type="button" aria-label="Enviar comentário" disabled={!commentDraft.trim()} onClick={() => void submitComment()}><Send className="size-4" /></Button></div>
        </div>}
      </div>
    </article>
  );
}
