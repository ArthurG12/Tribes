"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Users, ArrowRight, Bookmark } from "lucide-react";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_TRIBES } from "@/lib/tribes-data";

const STORAGE_KEY = "tribes-demo-rsvps";

export default function MyAgendaPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = value ? JSON.parse(value) : [];
      if (Array.isArray(parsed)) {
        setSelectedIds(parsed.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      setSelectedIds([]);
    }
    setReady(true);
  }, []);

  const selectedTribes = SAMPLE_TRIBES.filter((tribe) => selectedIds.includes(tribe.id));

  return (
    <PageShell>
      <PageIntro
        eyebrow="Área do participante · Demonstração"
        title="Minha agenda"
        description="Reúna os encontros que você marcou como interesse nas páginas das tribos."
      />
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {!ready ? (
          <div className="metric-card mt-8 text-center text-sm text-muted-foreground">Carregando sua agenda...</div>
        ) : selectedTribes.length === 0 ? (
          <div className="surface-card mt-8 border-dashed px-6 py-14 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarDays className="size-6" /></span>
            <h2 className="mt-4 font-heading text-xl font-bold text-foreground">Sua agenda está vazia</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Explore as comunidades e confirme presença em um encontro para ele aparecer aqui.</p>
            <Button className="mt-5 rounded-xl" render={<Link href="/explorar" />}>Encontrar uma tribo <ArrowRight className="size-4" /></Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {selectedTribes.map((tribe) => (
              <article key={tribe.id} className="event-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="secondary">{tribe.categoryLabel}</Badge>
                  <Badge className="bg-[#dce8d2] text-[#45613c]">Interesse registrado</Badge>
                </div>
                <h2 className="mt-4 font-heading text-xl font-bold text-foreground">{tribe.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{tribe.nextEvent.title}</p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" />{tribe.nextEvent.dateLabel}</p>
                  <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" />{tribe.nextEvent.locationLabel}</p>
                  <p className="flex items-center gap-2"><Users className="size-4 text-primary" />{tribe.membersCount} membros</p>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary"><Bookmark className="size-3.5" /> Na sua agenda local</span>
                  <Button size="sm" variant="outline" className="rounded-xl" render={<Link href={`/tribos/${tribe.id}`} />}>Ver encontro <ArrowRight className="size-3.5" /></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
