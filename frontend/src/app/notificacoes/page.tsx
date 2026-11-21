"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarCheck, Heart, ArrowRight } from "lucide-react";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";
import { Button } from "@/components/ui/button";
import { SAMPLE_TRIBES } from "@/lib/tribes-data";

const RSVP_KEY = "tribes-demo-rsvps";
const FAVORITES_KEY = "tribes-demo-favorites";
export default function NotificationsPage() {
  const [rsvps, setRsvps] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    const read = (key: string) => { try { const value = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; } catch { return []; } };
    setRsvps(read(RSVP_KEY)); setFavorites(read(FAVORITES_KEY));
  }, []);
  const items = [...SAMPLE_TRIBES.filter(tribe => rsvps.includes(tribe.id)).map(tribe => ({ id: tribe.id, title: "Presença registrada", description: tribe.nextEvent.title, icon: CalendarCheck })), ...SAMPLE_TRIBES.filter(tribe => favorites.includes(tribe.id)).map(tribe => ({ id: tribe.id, title: "Comunidade salva", description: tribe.name, icon: Heart }))];
  return <PageShell><PageIntro eyebrow="Atualizações" title="Notificações" description="Acompanhe suas atividades e comunidades salvas." /><section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">{items.length ? <div className="mt-8 space-y-3">{items.map((item) => { const ItemIcon = item.icon; return <article key={item.id+item.title} className="surface-card flex items-start gap-4 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ItemIcon className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.description}</p></div><Link aria-label="Abrir comunidade" href={`/tribos/${item.id}`} className="text-primary"><ArrowRight className="size-4" /></Link></article>; })}</div> : <div className="surface-card mt-8 p-10 text-center"><Bell className="mx-auto size-8 text-primary" /><h2 className="mt-3 font-heading text-lg font-bold">Tudo em dia</h2><p className="mt-1 text-sm text-muted-foreground">Quando você salvar uma tribo ou registrar presença, as atualizações aparecerão aqui.</p><Button className="mt-5" render={<Link href="/explorar" />}>Explorar tribos</Button></div>}<p className="mt-5 text-center text-xs text-muted-foreground">Atualizações locais da demonstração. Notificações em tempo real exigem conta e backend.</p></section></PageShell>;
}
