"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, MessageCircle, MoreVertical, Pencil, Send, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/social/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/social-types";

type TribeMessage = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  isMine: boolean;
  author: { id: string; name: string; avatarUrl: string | null };
};

const POLL_INTERVAL_MS = 3_000;
const MESSAGE_MENU_WIDTH = 144;
const MESSAGE_MENU_HEIGHT = 96;
const messageTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function messageMenuPosition(anchor: HTMLElement) {
  const bounds = anchor.getBoundingClientRect();
  const openBelow = window.innerHeight - bounds.bottom >= MESSAGE_MENU_HEIGHT + 8;
  const top = openBelow ? bounds.bottom + 4 : bounds.top - MESSAGE_MENU_HEIGHT - 4;
  const left = Math.max(8, Math.min(bounds.right - MESSAGE_MENU_WIDTH, window.innerWidth - MESSAGE_MENU_WIDTH - 8));
  return {
    top: Math.max(8, Math.min(top, window.innerHeight - MESSAGE_MENU_HEIGHT - 8)),
    left,
  };
}

function sortMessages(messages: TribeMessage[]) {
  return [...messages].sort((left, right) =>
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() || left.id.localeCompare(right.id)
  );
}

export function TribeChat({ tribeId }: { tribeId: string }) {
  const [messages, setMessages] = useState<TribeMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [openMenuMessage, setOpenMenuMessage] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [error, setError] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageCardsRef = useRef(new Map<string, HTMLElement>());
  const menuTriggersRef = useRef(new Map<string, HTMLButtonElement>());
  const messageRevisionRef = useRef(0);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let fetching = false;

    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      const revision = messageRevisionRef.current;
      try {
        const result = await apiRequest<{ messages: TribeMessage[] }>(`/api/tribes/${tribeId}/messages`, { cache: "no-store" });
        if (active && revision === messageRevisionRef.current) {
          setMessages(result.messages);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o chat.");
      } finally {
        fetching = false;
        if (active) {
          setLoading(false);
          timeout = setTimeout(() => void refresh(), POLL_INTERVAL_MS);
        }
      }
    };

    void refresh();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [tribeId]);

  useEffect(() => {
    if (!openMenuMessage) return;
    const repositionMenu = () => {
      const trigger = menuTriggersRef.current.get(openMenuMessage);
      if (trigger) setMenuPosition(messageMenuPosition(trigger));
    };
    window.addEventListener("resize", repositionMenu);
    window.addEventListener("scroll", repositionMenu, true);
    return () => {
      window.removeEventListener("resize", repositionMenu);
      window.removeEventListener("scroll", repositionMenu, true);
    };
  }, [openMenuMessage]);

  const latestMessageId = messages.length ? messages[messages.length - 1].id : null;
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [latestMessageId]);

  useEffect(() => {
    const messageId = editingMessage ?? confirmDelete;
    if (!messageId) return;

    const frame = window.requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      const messageCard = messageCardsRef.current.get(messageId);
      if (!container || !messageCard) return;

      const containerBounds = container.getBoundingClientRect();
      const cardBounds = messageCard.getBoundingClientRect();
      const visibleTop = containerBounds.top + container.clientTop;
      const visibleBottom = visibleTop + container.clientHeight;
      const bottomOverflow = cardBounds.bottom - (visibleBottom - 12);

      if (bottomOverflow > 0) {
        container.scrollBy({ top: bottomOverflow, behavior: "smooth" });
      } else if (cardBounds.top < visibleTop + 12) {
        container.scrollBy({ top: cardBounds.top - visibleTop - 12, behavior: "smooth" });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [editingMessage, confirmDelete]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError("");
    try {
      const result = await apiRequest<{ message: TribeMessage }>(`/api/tribes/${tribeId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: trimmed }),
      });
      messageRevisionRef.current += 1;
      setMessages((current) => sortMessages([...current.filter((message) => message.id !== result.message.id), result.message]));
      setBody("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function saveMessage(messageId: string) {
    const trimmed = editDraft.trim();
    if (!trimmed || pendingMessage) return;
    setPendingMessage(messageId);
    setError("");
    try {
      const result = await apiRequest<{ message: { id: string; body: string; editedAt: string } }>(
        `/api/tribes/${tribeId}/messages/${messageId}`,
        { method: "PATCH", body: JSON.stringify({ body: trimmed }) }
      );
      messageRevisionRef.current += 1;
      setMessages((current) => current.map((message) => message.id === messageId
        ? { ...message, body: result.message.body, editedAt: result.message.editedAt }
        : message));
      setEditingMessage(null);
      setEditDraft("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível editar a mensagem.");
    } finally {
      setPendingMessage(null);
    }
  }

  async function deleteMessage(messageId: string) {
    if (pendingMessage) return;
    setPendingMessage(messageId);
    setError("");
    try {
      await apiRequest(`/api/tribes/${tribeId}/messages/${messageId}`, { method: "DELETE" });
      messageRevisionRef.current += 1;
      setMessages((current) => current.filter((message) => message.id !== messageId));
      setConfirmDelete(null);
      setOpenMenuMessage(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível apagar a mensagem.");
    } finally {
      setPendingMessage(null);
    }
  }

  return (
    <section className="w-full min-w-0 max-w-full rounded-3xl border border-border bg-card p-3 sm:p-7" aria-labelledby="tribe-chat-title">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircle className="size-5" /></span>
        <div>
          <h2 id="tribe-chat-title" className="font-heading text-xl font-bold">Chat da tribo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Converse com os membros. As mensagens são apagadas após sete dias.</p>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div ref={messagesContainerRef} className="mt-4 w-full min-w-0 max-h-[26rem] min-h-36 space-y-3 overflow-x-hidden overflow-y-auto rounded-2xl border border-border bg-muted/30 p-2 sm:p-4" aria-live="polite" aria-label="Mensagens recentes">
        {loading ? (
          <div className="flex min-h-28 items-center justify-center"><LoaderCircle className="size-5 animate-spin text-primary" /></div>
        ) : messages.length ? messages.map((message) => (
          <article
            key={message.id}
            ref={(element) => {
              if (element) messageCardsRef.current.set(message.id, element);
              else messageCardsRef.current.delete(message.id);
            }}
            className="flex w-full min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:gap-2.5"
          >
            <UserAvatar name={message.author.name} avatarUrl={message.author.avatarUrl} className="size-8 sm:size-10" />
            <div className="w-full min-w-0 rounded-2xl bg-card px-3 py-2.5 shadow-xs sm:flex-1">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="min-w-0 max-w-28 flex-1 truncate whitespace-nowrap text-sm font-semibold" title={message.author.name}>{message.author.name}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <time className="whitespace-nowrap text-xs text-muted-foreground" dateTime={message.createdAt}>
                    {messageTime.format(new Date(message.createdAt))}{message.editedAt ? " · editada" : ""}
                  </time>
                  {message.isMine && <div className="relative">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Ações da sua mensagem para ${message.author.name}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuMessage === message.id}
                      aria-controls={`message-actions-${message.id}`}
                      ref={(element) => {
                        if (element) menuTriggersRef.current.set(message.id, element);
                        else menuTriggersRef.current.delete(message.id);
                      }}
                      onClick={(event) => {
                        if (openMenuMessage === message.id) {
                          setOpenMenuMessage(null);
                          setMenuPosition(null);
                        } else {
                          setMenuPosition(messageMenuPosition(event.currentTarget));
                          setOpenMenuMessage(message.id);
                        }
                      }}
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                    {openMenuMessage === message.id && menuPosition && typeof document !== "undefined" && createPortal(<div
                      id={`message-actions-${message.id}`}
                      role="menu"
                      className="fixed z-[100] w-36 rounded-xl border border-border bg-popover p-1 shadow-lg"
                      style={{ top: menuPosition.top, left: menuPosition.left }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => {
                          setEditingMessage(message.id);
                          setEditDraft(message.body);
                          setConfirmDelete(null);
                          setOpenMenuMessage(null);
                          setMenuPosition(null);
                        }}
                      ><Pencil className="size-4" />Editar</button>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => {
                          setConfirmDelete(message.id);
                          setEditingMessage(null);
                          setOpenMenuMessage(null);
                          setMenuPosition(null);
                        }}
                      ><Trash2 className="size-4" />Apagar</button>
                    </div>, document.body)}
                  </div>}
                </div>
              </div>
              {editingMessage === message.id ? <div className="mt-2 space-y-2">
                <Textarea
                  aria-label="Editar mensagem"
                  value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.repeat) return;
                    event.preventDefault();
                    void saveMessage(message.id);
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" disabled={pendingMessage === message.id} onClick={() => { setEditingMessage(null); setEditDraft(""); }}>Cancelar</Button>
                  <Button type="button" size="sm" disabled={pendingMessage === message.id || !editDraft.trim()} onClick={() => void saveMessage(message.id)}>
                    {pendingMessage === message.id && <LoaderCircle className="size-4 animate-spin" />}Salvar
                  </Button>
                </div>
              </div> : <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{message.body}</p>}
              {confirmDelete === message.id && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm">Apagar esta mensagem permanentemente?</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" disabled={pendingMessage === message.id} onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                  <Button type="button" size="sm" variant="destructive" autoFocus disabled={pendingMessage === message.id} onClick={() => void deleteMessage(message.id)}>
                    {pendingMessage === message.id && <LoaderCircle className="size-4 animate-spin" />}Apagar
                  </Button>
                </div>
              </div>}
            </div>
          </article>
        )) : (
          <p className="flex min-h-28 items-center justify-center text-center text-sm text-muted-foreground">Ainda não há mensagens. Comece a conversa!</p>
        )}
      </div>

      <form className="mt-4 space-y-2" onSubmit={sendMessage}>
        <label htmlFor="tribe-chat-message" className="sr-only">Escreva uma mensagem</label>
        <Textarea
          id="tribe-chat-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Escreva uma mensagem para a tribo..."
          maxLength={1000}
          rows={2}
          className="min-h-20 resize-y rounded-2xl bg-background"
          disabled={sending}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.repeat) return;
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{body.length}/1000</span>
          <Button type="submit" className="rounded-xl" disabled={sending || !body.trim()}>
            {sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar
          </Button>
        </div>
      </form>
    </section>
  );
}
