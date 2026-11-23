"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import {
  BarChart3,
  CalendarDays,
  ImagePlus,
  LoaderCircle,
  Send,
  X,
} from "lucide-react";
import { useCurrentUser } from "@/components/social/auth-guard";
import { UserAvatar } from "@/components/social/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageFileError, readImageAsDataUrl } from "@/lib/image-file";
import { apiRequest, type Tribe } from "@/lib/social-types";

interface FeedComposerProps {
  tribes: Tribe[];
  onPublished: () => Promise<void>;
}

const toolButton = "inline-flex size-9 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export function FeedComposer({ tribes, onPublished }: FeedComposerProps) {
  const { user } = useCurrentUser();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tribeId, setTribeId] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [creating, setCreating] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [eventMode, setEventMode] = useState(false);
  const [pollMode, setPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCost, setEventCost] = useState("");
  const [eventCapacity, setEventCapacity] = useState("");

  const selectedTribeId = tribeId && tribes.some((tribe) => tribe.id === tribeId)
    ? tribeId
    : tribes[0]?.id ?? "";

  function resizeTextarea() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 320)}px`;
  }

  function changeEventMode(nextMode: boolean) {
    setEventMode(nextMode);
    setPollMode(false);
    setComposerError("");
    setImageError("");
    if (nextMode) setImage(null);
  }

  function changePollMode(nextMode: boolean) {
    setPollMode(nextMode);
    setEventMode(false);
    setImage(null);
    setComposerError("");
    setImageError("");
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError("");
    setComposerError("");
    if (!file) return;

    changeEventMode(false);
    setPollMode(false);
    setImage(null);
    try {
      setImage(await readImageAsDataUrl(file));
    } catch (selectionError) {
      setImageError(selectionError instanceof ImageFileError && selectionError.code === "unsupported-type"
        ? "Escolha uma imagem JPEG, PNG ou WebP."
        : selectionError instanceof ImageFileError && selectionError.code === "too-large"
          ? "A imagem deve ter no máximo 5 MB."
          : "Não foi possível ler essa imagem.");
    } finally {
      event.target.value = "";
    }
  }

  async function submitContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTribeId || !body.trim()) return;
    if (eventMode) {
      const startsAt = new Date(eventStartsAt);
      const endsAt = eventEndsAt ? new Date(eventEndsAt) : null;
      if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
        setComposerError("Informe uma data e um horário válidos para o evento.");
        return;
      }
      if (endsAt && endsAt <= startsAt) {
        setComposerError("A data de término deve ser posterior ao início.");
        return;
      }
    }
    setCreating(true);
    setComposerError("");
    try {
      if (pollMode) {
        await apiRequest(`/api/tribes/${selectedTribeId}/posts`, {
          method: "POST",
          body: JSON.stringify({ body, pollOptions: pollOptions.map((option) => option.trim()) }),
        });
      } else if (eventMode) {
        await apiRequest(`/api/tribes/${selectedTribeId}/events`, {
          method: "POST",
          body: JSON.stringify({
            body,
            title: eventTitle,
            startsAt: new Date(eventStartsAt).toISOString(),
            endsAt: eventEndsAt ? new Date(eventEndsAt).toISOString() : null,
            location: eventLocation,
            cost: eventCost,
            maxAttendees: eventCapacity ? Number(eventCapacity) : null,
          }),
        });
      } else {
        await apiRequest(`/api/tribes/${selectedTribeId}/posts`, {
          method: "POST",
          body: JSON.stringify({ body, image: image ?? undefined }),
        });
      }

      setBody("");
      setPollOptions(["", ""]);
      setImage(null);
      setImageError("");
      setEventMode(false);
      setPollMode(false);
      setEventTitle("");
      setEventStartsAt("");
      setEventEndsAt("");
      setEventLocation("");
      setEventCost("");
      setEventCapacity("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      await onPublished();
    } catch (submitError) {
      setComposerError(submitError instanceof Error ? submitError.message : "Não foi possível publicar.");
    } finally {
      setCreating(false);
    }
  }

  const pollInvalid = pollMode && (
    pollOptions.some((option) => !option.trim())
    || new Set(pollOptions.map((option) => option.trim().toLocaleLowerCase("pt-BR"))).size !== pollOptions.length
  );

  const placeholder = eventMode
    ? "Conte um pouco sobre o evento..."
    : pollMode
      ? "Qual é a sua pergunta?"
      : "O que está acontecendo?";

  return (
    <form
      onSubmit={(event) => void submitContent(event)}
      className="w-full min-w-0 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5"
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-11" />
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            aria-label="Escreva sua publicação"
            placeholder={placeholder}
            value={body}
            rows={2}
            maxLength={5000}
            disabled={creating}
            onChange={(event) => { setBody(event.target.value); resizeTextarea(); }}
            className="block min-h-12 w-full resize-none border-0 bg-transparent py-2 text-lg leading-snug text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
          />

          {eventMode && <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
            <Input aria-label="Título do evento" placeholder="Título do evento" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={120} required />
            <Input aria-label="Local do evento" placeholder="Local" value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} maxLength={240} required />
            <Input aria-label="Início do evento" type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} required />
            <Input aria-label="Término do evento" type="datetime-local" value={eventEndsAt} onChange={(event) => setEventEndsAt(event.target.value)} />
            <Input aria-label="Custo do evento" placeholder="Custo (opcional)" value={eventCost} onChange={(event) => setEventCost(event.target.value)} maxLength={100} />
            <Input aria-label="Limite de participantes" type="number" min="1" max="10000" placeholder="Limite de participantes" value={eventCapacity} onChange={(event) => setEventCapacity(event.target.value)} />
          </div>}

          {pollMode && <div className="mt-2 space-y-2">
            <p className="text-sm font-semibold">Opções da enquete</p>
            {pollOptions.map((option, index) => <div key={index} className="flex gap-2">
              <Input aria-label={`Opção ${index + 1}`} placeholder={`Opção ${index + 1}`} value={option} maxLength={80} onChange={(event) => setPollOptions((current) => current.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} />
              {pollOptions.length > 2 && <button type="button" aria-label={`Remover opção ${index + 1}`} onClick={() => setPollOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))} className="rounded-lg px-3 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
            </div>)}
            {pollOptions.length < 6 && <button type="button" onClick={() => setPollOptions((current) => [...current, ""])} className="text-sm font-semibold text-primary hover:underline">Adicionar opção</button>}
          </div>}

          {image && <div className="relative mt-2 w-fit max-w-full rounded-xl border border-border bg-muted/40 p-2">
            <Image src={image} alt="Pré-visualização da imagem" width={1200} height={900} unoptimized className="max-h-64 w-auto max-w-full rounded-lg object-contain" />
            <button type="button" aria-label="Remover imagem" onClick={() => { setImage(null); setImageError(""); }} className="absolute right-3 top-3 rounded-full bg-background/90 p-1.5 text-foreground shadow hover:bg-background"><X className="size-4" /></button>
          </div>}

          {imageError && <p role="alert" className="mt-2 text-sm text-destructive">{imageError}</p>}
          {!tribes.length && <p className="mt-2 text-sm text-muted-foreground">Entre em uma tribo antes de publicar.</p>}
          {composerError && <p role="alert" className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{composerError}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border pt-3">
            <div className="-ml-2 flex items-center gap-0.5">
              <label htmlFor="composer-image" title="Adicionar imagem" className={`${toolButton} cursor-pointer`}>
                <ImagePlus className="size-5" />
                <span className="sr-only">Adicionar imagem</span>
              </label>
              <input id="composer-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={creating} onChange={(event) => void selectImage(event)} className="sr-only" />
              <button type="button" title="Criar enquete" aria-label="Criar enquete" aria-pressed={pollMode} disabled={creating} onClick={() => changePollMode(!pollMode)} className={`${toolButton} ${pollMode ? "bg-primary/10" : ""}`}>
                <BarChart3 className="size-5" />
              </button>
              <button type="button" title="Criar evento" aria-label="Criar evento" aria-pressed={eventMode} disabled={creating} onClick={() => changeEventMode(!eventMode)} className={`${toolButton} ${eventMode ? "bg-primary/10" : ""}`}>
                <CalendarDays className="size-5" />
              </button>
            </div>

            <select aria-label="Tribo onde publicar" value={selectedTribeId} onChange={(event) => setTribeId(event.target.value)} required disabled={!tribes.length || creating}
              className="h-9 min-w-0 max-w-full flex-1 rounded-full border border-input bg-background px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-56 sm:flex-none">
              {tribes.length ? tribes.map((tribe) => <option key={tribe.id} value={tribe.id}>{tribe.name}</option>) : <option value="">Sem tribos</option>}
            </select>

            <Button type="submit" disabled={creating || !tribes.length || !body.trim() || pollInvalid} className="ml-auto rounded-full px-5">
              {creating ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              {eventMode ? "Publicar evento" : pollMode ? "Publicar enquete" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
