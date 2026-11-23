"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Users, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, formatDateTime } from "@/lib/social-types";

type EventItem = {
  id: string;
  body: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  tribe: { id: string; name: string };
  authorName: string;
  attendeesCount: number;
  attendingByMe: boolean;
};

function dateKey(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(value));
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ events: EventItem[] }>("/api/events")
      .then((result) => { if (active) setEvents(result.events); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar os eventos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function toggleAttendance(event: EventItem) {
    try {
      const result = await apiRequest<{ attendeesCount: number; attendingByMe: boolean }>(`/api/content/${event.id}/attendance`, {
        method: event.attendingByMe ? "DELETE" : "POST",
      });
      setEvents((current) => current.map((item) => item.id === event.id ? { ...item, ...result } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar sua presença.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Agenda da comunidade</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold">Próximos eventos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tudo que vai acontecer nas tribos das quais você participa.</p>
      </section>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><LoaderCircle className="size-6 animate-spin text-primary" /></div> : events.length ? (
        <div className="space-y-4">
          {events.map((event) => (
            <article key={event.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge className="bg-primary/10 text-primary"><CalendarDays className="size-3" />{dateKey(event.startsAt)}</Badge>
                <span className="text-xs text-muted-foreground">por {event.authorName}</span>
              </div>
              <h2 className="mt-3 font-heading text-xl font-bold">{event.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.body}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4 text-primary" />{formatDateTime(event.startsAt)}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" />{event.location}</span>
                <span className="inline-flex items-center gap-1.5"><Users className="size-4 text-primary" />{event.attendeesCount} confirmados</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-xs font-semibold text-muted-foreground">{event.tribe.name}</span>
                <div className="flex items-center gap-3">
                  <Link href="/feed" className="text-sm font-semibold text-primary hover:underline">Ver no feed</Link>
                  <Button size="sm" variant={event.attendingByMe ? "outline" : "default"} onClick={() => void toggleAttendance(event)}>
                    {event.attendingByMe ? "Cancelar presença" : "Confirmar presença"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <CalendarDays className="mx-auto size-8 text-primary" />
          <h2 className="mt-3 font-heading text-xl font-bold">Agenda livre por enquanto</h2>
          <p className="mt-2 text-sm text-muted-foreground">Quando suas tribos criarem eventos futuros, eles aparecerão aqui.</p>
        </section>
      )}
    </main>
  );
}
