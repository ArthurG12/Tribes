"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, MessageCircle, Send } from "lucide-react";
import { UserAvatar } from "@/components/social/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/social-types";

type TribeMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
};

const POLL_INTERVAL_MS = 3_000;
const messageTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

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
  const [error, setError] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let fetching = false;

    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await apiRequest<{ messages: TribeMessage[] }>(`/api/tribes/${tribeId}/messages`, { cache: "no-store" });
        if (active) {
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

  const latestMessageId = messages.length ? messages[messages.length - 1].id : null;
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [latestMessageId]);

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
      setMessages((current) => sortMessages([...current.filter((message) => message.id !== result.message.id), result.message]));
      setBody("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7" aria-labelledby="tribe-chat-title">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircle className="size-5" /></span>
        <div>
          <h2 id="tribe-chat-title" className="font-heading text-xl font-bold">Chat da tribo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Converse com os membros. As mensagens são apagadas após sete dias.</p>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 max-h-[26rem] min-h-36 space-y-3 overflow-y-auto rounded-2xl border border-border bg-muted/30 p-3 sm:p-4" aria-live="polite" aria-label="Mensagens recentes">
        {loading ? (
          <div className="flex min-h-28 items-center justify-center"><LoaderCircle className="size-5 animate-spin text-primary" /></div>
        ) : messages.length ? messages.map((message) => (
          <article key={message.id} className="flex min-w-0 items-start gap-2.5">
            <UserAvatar name={message.author.name} avatarUrl={message.author.avatarUrl} />
            <div className="min-w-0 flex-1 rounded-2xl bg-card px-3 py-2.5 shadow-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="break-words text-sm font-semibold">{message.author.name}</p>
                <time className="shrink-0 text-xs text-muted-foreground" dateTime={message.createdAt}>{messageTime.format(new Date(message.createdAt))}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
            </div>
          </article>
        )) : (
          <p className="flex min-h-28 items-center justify-center text-center text-sm text-muted-foreground">Ainda não há mensagens. Comece a conversa!</p>
        )}
        <div ref={endOfMessagesRef} />
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
