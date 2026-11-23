"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Users, LoaderCircle, Search, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventLocationMap } from "@/components/social/event-location-picker";
import { EventLocationActions } from "@/components/social/event-location-actions";
import { apiRequest, formatDateTime, type Tribe } from "@/lib/social-types";

type EventItem = {
  id: string;
  body: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  lat: number | null;
  lon: number | null;
  cost: string | null;
  maxAttendees: number | null;
  tribe: { id: string; name: string };
  authorName: string;
  attendeesCount: number;
  waitlistCount: number;
  attendingByMe: boolean;
  waitlistedByMe: boolean;
};

function dateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTribe, setSelectedTribe] = useState("all");
  const [loading, setLoading] = useState(true);
  const [pendingEvent, setPendingEvent] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadEvents(search = query, tribeId = selectedTribe) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (tribeId !== "all") params.set("tribeId", tribeId);
    const result = await apiRequest<{ events: EventItem[] }>(`/api/events?${params.toString()}`);
    setEvents(result.events);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ events: EventItem[] }>("/api/events"),
      apiRequest<{ tribes: Tribe[] }>("/api/tribes?mine=true"),
    ])
      .then(([eventResult, tribeResult]) => {
        if (!active) return;
        setEvents(eventResult.events);
        setTribes(tribeResult.tribes);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar os eventos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function toggleAttendance(event: EventItem) {
    if (pendingEvent) return;
    setPendingEvent(event.id);
    setError("");
    try {
      const result = await apiRequest<{
        attendeesCount: number;
        attendingByMe: boolean;
        waitlistedByMe: boolean;
        waitlistCount: number;
      }>(`/api/content/${event.id}/attendance`, {
        method: event.attendingByMe || event.waitlistedByMe ? "DELETE" : "POST",
      });
      setEvents((current) => current.map((item) => item.id === event.id ? { ...item, ...result } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar sua presença.");
    } finally {
      setPendingEvent(null);
    }
  }

  const visibleEvents = events;
  const mappedEvents = visibleEvents.filter((event) => event.lat !== null && event.lon !== null);

  function exportCalendar() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Tribes//Agenda//PT-BR",
      "CALSCALE:GREGORIAN",
      ...visibleEvents.flatMap((event) => {
        const start = toIcsDate(event.startsAt);
        const end = event.endsAt ? toIcsDate(event.endsAt) : null;
        if (!start) return [];
        return [
          "BEGIN:VEVENT",
          `UID:${event.id}@tribes`,
          `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
          `DTSTART:${start}`,
          ...(end ? [`DTEND:${end}`] : []),
          `SUMMARY:${escapeIcs(event.title)}`,
          `DESCRIPTION:${escapeIcs(event.body)}`,
          `LOCATION:${escapeIcs(event.location)}`,
          `CATEGORIES:${escapeIcs(event.tribe.name)}`,
          "END:VEVENT",
        ];
      }),
      "END:VCALENDAR",
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tribes-eventos.ics";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function applyFilters() {
    setLoading(true);
    setError("");
    try {
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível filtrar os eventos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Agenda da comunidade</p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold sm:text-3xl">Próximos eventos</h1>
          <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">Tudo que vai acontecer nas tribos das quais você participa.</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={exportCalendar} disabled={!visibleEvents.length}>
          <Download className="size-4" />Exportar calendário
        </Button>
      </section>
      <section className="grid min-w-0 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end sm:p-5">
        <div className="space-y-2">
          <label htmlFor="event-search" className="text-sm font-semibold">Pesquisar eventos</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input id="event-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void applyFilters(); }} placeholder="Nome, local ou descrição" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="event-tribe" className="text-sm font-semibold">Tribo</label>
          <select id="event-tribe" value={selectedTribe} onChange={(event) => setSelectedTribe(event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="all">Todas as tribos</option>
            {tribes.map((tribe) => <option key={tribe.id} value={tribe.id}>{tribe.name}</option>)}
          </select>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => void applyFilters()} disabled={loading}>Filtrar</Button>
      </section>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><LoaderCircle className="size-6 animate-spin text-primary" /></div> : visibleEvents.length ? (
        <div className="space-y-4">
          {mappedEvents.length > 0 && (
            <section className="space-y-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
              <h2 className="font-heading text-lg font-bold">Locais exatos dos eventos</h2>
              <EventLocationMap
                points={mappedEvents.map((event) => ({ id: event.id, lat: event.lat!, lon: event.lon!, formatted: `${event.title} · ${event.location}` }))}
                className="h-72"
              />
            </section>
          )}
          {visibleEvents.map((event) => (
            <article key={event.id} className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge className="bg-primary/10 text-primary"><CalendarDays className="size-3" />{dateKey(event.startsAt)}</Badge>
                <span className="text-xs text-muted-foreground">por {event.authorName}</span>
              </div>
              <h2 className="mt-3 font-heading text-xl font-bold">{event.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.body}</p>
              <div className="mt-4 flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4 text-primary" />{formatDateTime(event.startsAt)}{event.endsAt ? ` – ${formatDateTime(event.endsAt)}` : ""}</span>
                <span className="inline-flex min-w-0 items-start gap-1.5 break-words"><MapPin className="size-4 shrink-0 text-primary" /><span className="min-w-0 break-words">{event.location}</span></span>
                {event.cost && <span>{event.cost}</span> }
                <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-primary" />{event.attendeesCount}{event.maxAttendees ? `/${event.maxAttendees}` : ""} confirmados</span>
                {event.waitlistCount > 0 && <span>{event.waitlistCount} na lista de espera</span>}
              </div>
              <div className="mt-3">
                <EventLocationActions location={event.location} lat={event.lat} lon={event.lon} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-xs font-semibold text-muted-foreground">{event.tribe.name}</span>
                <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <Link href={`/feed?focus=${event.id}`} className="text-center text-sm font-semibold text-primary hover:underline sm:text-left">Ver no feed</Link>
                  <Button className="w-full sm:w-auto" size="sm" variant={event.attendingByMe ? "outline" : "default"} disabled={pendingEvent !== null} onClick={() => void toggleAttendance(event)}>
                    {pendingEvent === event.id ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    {event.attendingByMe ? "Cancelar presença" : event.waitlistedByMe ? "Sair da espera" : event.maxAttendees && event.attendeesCount >= event.maxAttendees ? "Entrar na lista de espera" : "Confirmar presença"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-border bg-card px-4 py-10 text-center sm:px-5 sm:py-12">
          <CalendarDays className="mx-auto size-8 text-primary" />
          <h2 className="mt-3 font-heading text-xl font-bold">Nenhum evento encontrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tente mudar a pesquisa ou o filtro de tribo.</p>
        </section>
      )}
    </main>
  );
}
