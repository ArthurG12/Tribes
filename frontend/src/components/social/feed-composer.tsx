"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import {
  ImagePlus,
  LoaderCircle,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EventLocationPicker, type EventLocation } from "@/components/social/event-location-picker";
import { ImageFileError, readImageAsDataUrl } from "@/lib/image-file";
import { apiRequest, type Tribe } from "@/lib/social-types";

interface FeedComposerProps {
  tribes: Tribe[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished: () => Promise<void>;
}

export function FeedComposer({ tribes, open, onOpenChange, onPublished }: FeedComposerProps) {
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
  const [eventLocationCoordinates, setEventLocationCoordinates] = useState<Pick<EventLocation, "lat" | "lon"> | null>(null);
  const [eventCost, setEventCost] = useState("");
  const [eventCapacity, setEventCapacity] = useState("");
  useEffect(() => {
    if (open) {
      setComposerError("");
      setImageError("");
    }
  }, [open]);

  const selectedTribeId = tribeId && tribes.some((tribe) => tribe.id === tribeId)
    ? tribeId
    : tribes[0]?.id ?? "";

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setComposerError("");
      setImageError("");
    }
    onOpenChange(nextOpen);
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

    setImage(null);
    try {
      setImage(await readImageAsDataUrl(file));
    } catch (selectionError) {
      setImageError(selectionError instanceof ImageFileError && selectionError.code === "unsupported-type"
        ? "Escolha uma imagem JPEG, PNG ou WebP."
        : selectionError instanceof ImageFileError && selectionError.code === "too-large"
          ? "A imagem deve ter no máximo 5 MB."
          : "Não foi possível ler essa imagem.");
      event.target.value = "";
    }
  }

  async function submitContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTribeId) return;
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
            lat: eventLocationCoordinates?.lat ?? null,
            lon: eventLocationCoordinates?.lon ?? null,
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
      setEventTitle("");
      setEventStartsAt("");
      setEventEndsAt("");
      setEventLocation("");
      setEventLocationCoordinates(null);
      setEventCost("");
      setEventCapacity("");
      await onPublished();
      onOpenChange(false);
    } catch (submitError) {
      setComposerError(submitError instanceof Error ? submitError.message : "Não foi possível publicar.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="box-border w-[calc(100%-2rem)] max-w-2xl min-w-0 max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto rounded-2xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">Compartilhe com sua tribo</DialogTitle>
          <DialogDescription>Publique uma novidade, crie um evento ou faça uma enquete para sua tribo.</DialogDescription>
        </DialogHeader>
        <form className="w-full min-w-0 space-y-3" onSubmit={(event) => void submitContent(event)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button type="button" disabled={creating} onClick={() => changeEventMode(false)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!eventMode && !pollMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Publicação</button>
              <button type="button" disabled={creating} onClick={() => changeEventMode(true)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${eventMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Evento</button>
              <button type="button" disabled={creating} onClick={() => changePollMode(true)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${pollMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Enquete</button>
            </div>
          </div>
          <select aria-label="Tribo onde publicar" value={selectedTribeId} onChange={(event) => setTribeId(event.target.value)} required disabled={!tribes.length}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {tribes.length ? tribes.map((tribe) => <option key={tribe.id} value={tribe.id}>{tribe.name}</option>) : <option value="">Entre em uma tribo para publicar</option>}
          </select>
          {eventMode && <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <Input aria-label="Título do evento" placeholder="Título do evento" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} required />
            <EventLocationPicker
              id="event-location"
              label="Local do evento"
              value={eventLocation}
              coordinates={eventLocationCoordinates}
              onChange={(value, location) => {
                setEventLocation(value);
                setEventLocationCoordinates(location ? { lat: location.lat, lon: location.lon } : null);
              }}
            />
            <Input aria-label="Início do evento" type="datetime-local" value={eventStartsAt} onChange={(event) => setEventStartsAt(event.target.value)} required />
            <Input aria-label="Término do evento" type="datetime-local" value={eventEndsAt} onChange={(event) => setEventEndsAt(event.target.value)} />
            <Input aria-label="Custo do evento" placeholder="Custo (opcional)" value={eventCost} onChange={(event) => setEventCost(event.target.value)} />
            <Input aria-label="Limite de participantes" type="number" min="1" placeholder="Limite de participantes" value={eventCapacity} onChange={(event) => setEventCapacity(event.target.value)} />
          </div>}
          <Textarea placeholder={eventMode ? "Conte um pouco sobre o evento..." : pollMode ? "Qual é a sua pergunta?" : "O que está acontecendo na sua tribo?"} value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} required />
          {pollMode && <div className="space-y-2">
            <p className="text-sm font-semibold">Opções da enquete</p>
            {pollOptions.map((option, index) => <div key={index} className="flex gap-2">
              <Input aria-label={`Opção ${index + 1}`} placeholder={`Opção ${index + 1}`} value={option} maxLength={80} onChange={(event) => setPollOptions((current) => current.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} />
              {pollOptions.length > 2 && <button type="button" aria-label={`Remover opção ${index + 1}`} onClick={() => setPollOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))} className="rounded-lg px-3 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
            </div>)}
            {pollOptions.length < 6 && <button type="button" onClick={() => setPollOptions((current) => [...current, ""])} className="text-sm font-semibold text-primary hover:underline">Adicionar opção</button>}
          </div>}
          {!eventMode && !pollMode && <div className="space-y-2">
            <label htmlFor="post-image" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted">
              <ImagePlus className="size-4" />Adicionar imagem
            </label>
            <Input id="post-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectImage(event)} className="sr-only" aria-label="Adicionar imagem à publicação" />
            <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP · até 5 MB</p>
            {imageError && <p role="alert" className="text-sm text-destructive">{imageError}</p>}
            {image && <div className="relative w-fit max-w-full rounded-xl border border-border bg-muted/40 p-2">
              <Image src={image} alt="Pré-visualização da imagem" width={1200} height={900} unoptimized className="max-h-64 w-auto max-w-full rounded-lg object-contain" />
              <button type="button" aria-label="Remover imagem" onClick={() => { setImage(null); setImageError(""); }} className="absolute right-3 top-3 rounded-full bg-background/90 p-1.5 text-foreground shadow hover:bg-background"><X className="size-4" /></button>
            </div>}
          </div>}
          {!tribes.length && <p className="text-sm text-muted-foreground">Entre em uma tribo antes de publicar.</p>}
          {composerError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{composerError}</p>}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="ghost" disabled={creating} onClick={() => handleOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={creating || !tribes.length || !body.trim() || (pollMode && (pollOptions.some((option) => !option.trim()) || new Set(pollOptions.map((option) => option.trim().toLocaleLowerCase("pt-BR"))).size !== pollOptions.length))} className="rounded-xl">
              {creating ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
              {eventMode ? "Publicar evento" : pollMode ? "Publicar enquete" : "Publicar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
