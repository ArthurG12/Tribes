"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, LoaderCircle, MapPin } from "lucide-react";
import { apiRequest, formatDateTime } from "@/lib/social-types";

type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  tribe: { id: string; name: string };
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const leadingDays = (first.getDay() + 6) % 7;
  const numberOfDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const numberOfCells = Math.ceil((leadingDays + numberOfDays) / 7) * 7;

  return Array.from({ length: numberOfCells }, (_, index) =>
    new Date(month.getFullYear(), month.getMonth(), index - leadingDays + 1),
  );
}

function eventDatesByDay(events: CalendarEvent[], month: Date) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const eventsByDay = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const startsAt = new Date(event.startsAt);
    const endsAt = new Date(event.endsAt ?? event.startsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) continue;

    const firstEventDay = new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate());
    const lastEventDay = new Date(endsAt.getFullYear(), endsAt.getMonth(), endsAt.getDate());
    const cursor = firstEventDay < firstOfMonth ? firstOfMonth : firstEventDay;
    const end = lastEventDay > lastOfMonth ? lastOfMonth : lastEventDay;

    while (cursor <= end) {
      const key = dateKey(cursor);
      eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return eventsByDay;
}

export default function EventsPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      attending: "true",
    });

    apiRequest<{ events: CalendarEvent[] }>(`/api/events?${params.toString()}`)
      .then((result) => { if (active) setEvents(result.events); })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os eventos.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [month]);

  const days = useMemo(() => monthDays(month), [month]);
  const daysByEvent = useMemo(() => eventDatesByDay(events, month), [events, month]);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month);
  const monthHeading = monthLabel.charAt(0).toLocaleUpperCase("pt-BR") + monthLabel.slice(1);
  const todayKey = dateKey(new Date());

  function selectMonth(nextMonth: Date) {
    setMonth(nextMonth);
    setLoading(true);
    setEvents([]);
    setError("");
  }

  function moveMonth(offset: number) {
    selectMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  function goToCurrentMonth() {
    const now = new Date();
    selectMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-5 px-3 py-5 pb-24 sm:space-y-6 sm:px-6 sm:py-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Sua agenda</p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold sm:text-3xl">Calendário de eventos</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Eventos em que você confirmou presença nas suas tribos.</p>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-1.5 sm:justify-end">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => moveMonth(-1)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h2 aria-live="polite" className="min-w-36 text-center font-heading text-base font-bold sm:min-w-44 sm:text-lg">
            {monthHeading}
          </h2>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => moveMonth(1)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="size-5" />
          </button>
          <button
            type="button"
            onClick={goToCurrentMonth}
            className="ml-1 rounded-lg px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Hoje
          </button>
        </div>
      </section>

      <section aria-label={`Calendário de ${monthLabel}`} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div role="grid" aria-label={`Eventos de ${monthLabel}`} aria-busy={loading} className="min-w-0">
          <div role="row" className="grid grid-cols-7 border-b border-border bg-muted/40">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} role="columnheader" className="py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:py-3 sm:text-xs">
                {weekday}
              </div>
            ))}
          </div>
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => (
            <div key={weekIndex} role="row" className="grid grid-cols-7">
              {days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
                const key = dateKey(day);
                const isCurrentMonth = day.getMonth() === month.getMonth();
                const isToday = key === todayKey;
                const dayEvents = daysByEvent.get(key) ?? [];
                const accessibleDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(day);

                return (
                  <div
                    key={key}
                    role="gridcell"
                    aria-label={`${accessibleDate}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"}` : ""}`}
                    aria-current={isToday ? "date" : undefined}
                    className={`min-h-24 min-w-0 border-b border-r border-border p-1.5 sm:min-h-36 sm:p-2.5 ${isCurrentMonth ? "bg-card" : "bg-muted/20"}`}
                  >
                    <span className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold sm:size-7 sm:text-xs ${isToday ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-0.5 sm:mt-2 sm:gap-1">
                        {dayEvents.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            aria-label={`Ir para o evento ${event.title}`}
                            title={event.title}
                            onClick={() => {
                              const eventLink = document.getElementById(`monthly-event-${event.id}`);
                              eventLink?.scrollIntoView({ behavior: "smooth", block: "center" });
                              if (eventLink instanceof HTMLAnchorElement) eventLink.focus({ preventScroll: true });
                            }}
                            className="inline-flex size-6 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <CalendarDays className="size-4" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {loading && (
          <div className="flex items-center justify-center gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="size-4 animate-spin text-primary" />Carregando eventos…
          </div>
        )}
      </section>

      <section aria-labelledby="monthly-events-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="monthly-events-heading" className="font-heading text-xl font-bold">Eventos do mês</h2>
          {!loading && !error && events.length > 0 && (
            <span className="text-sm text-muted-foreground">{events.length} {events.length === 1 ? "evento" : "eventos"}</span>
          )}
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        ) : loading ? (
          <p role="status" className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-primary" />Carregando eventos…
          </p>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center sm:py-10">
            <CalendarDays className="mx-auto size-7 text-primary" />
            <h3 className="mt-3 font-heading text-lg font-bold">Nenhum evento confirmado neste mês</h3>
            <p className="mt-1 text-sm text-muted-foreground">Quando você confirmar presença em um evento, ele aparecerá aqui.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  id={`monthly-event-${event.id}`}
                  href={`/feed?focus=${event.id}`}
                  className="group block rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
                >
                  <h3 className="font-heading font-bold transition-colors group-hover:text-primary">{event.title}</h3>
                  <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
                    <p className="inline-flex items-start gap-2">
                      <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{formatDateTime(event.startsAt)}{event.endsAt ? ` – ${formatDateTime(event.endsAt)}` : ""}</span>
                    </p>
                    <p className="inline-flex items-start gap-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{event.location}</span>
                    </p>
                    <p className="text-xs sm:self-center">Tribo: {event.tribe.name}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
