import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users, Sparkles, CheckCircle2, Store, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/tribes/page-shell";
import { TribeRsvpButton } from "@/components/tribes/tribe-rsvp-button";
import { SAMPLE_TRIBES } from "@/lib/tribes-data";

export default async function TribeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tribe = SAMPLE_TRIBES.find((item) => item.id === id);

  if (!tribe) notFound();

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <Link href="/explorar" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="size-4" /> Voltar para explorar
        </Link>

        <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{tribe.categoryLabel}</Badge>
              <Badge variant="outline">{tribe.format}</Badge>
              {tribe.beginnerFriendly && <Badge className="bg-[#dce8d2] text-[#45613c]">Aberto para iniciantes</Badge>}
            </div>

            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">{tribe.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{tribe.tagline}</p>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-primary" />{tribe.neighborhood} · {tribe.city}</span>
              <span className="inline-flex items-center gap-2"><Users className="size-4 text-primary" />{tribe.membersCount} membros</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-primary" />{tribe.weeklyFrequency}</span>
            </div>

            <section className="surface-card mt-9 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Próximo encontro</p>
                  <h2 className="mt-2 font-heading text-xl font-bold text-foreground sm:text-2xl">{tribe.nextEvent.title}</h2>
                </div>
                <Badge variant="outline">{tribe.nextEvent.confirmedCount}/{tribe.nextEvent.maxSpots} confirmados</Badge>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-[#f5f8f1] p-4">
                  <CalendarDays className="size-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold text-foreground">{tribe.nextEvent.dateLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tribe.weeklyFrequency}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-[#f5f8f1] p-4">
                  <MapPin className="size-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold text-foreground">{tribe.nextEvent.locationLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tribe.nextEvent.costLabel}</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold text-foreground">Informações importantes</p>
                <ul className="mt-3 space-y-2">
                  {tribe.nextEvent.pinnedNotes.map((note) => (
                    <li key={note} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{note}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="font-heading text-xl font-bold text-foreground">Conheça a comunidade</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="surface-card p-5">
                  <Users className="size-5 text-primary" />
                  <h3 className="mt-3 font-semibold text-foreground">Organização</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Organizada por {tribe.organizerName}. A frequência dos encontros é {tribe.weeklyFrequency.toLowerCase()}.</p>
                </div>
                <div className="surface-card p-5">
                  {tribe.partnerVenue ? <Store className="size-5 text-primary" /> : <Sparkles className="size-5 text-primary" />}
                  <h3 className="mt-3 font-semibold text-foreground">{tribe.partnerVenue ? "Espaço relacionado" : "Novos membros"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tribe.partnerVenue ?? "A comunidade está aberta para pessoas interessadas em participar e contribuir."}</p>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-5 text-primary" />
                <h2 className="font-heading text-xl font-bold text-foreground">Últimas conversas</h2>
              </div>
              <div className="mt-4 space-y-3">
                {tribe.recentMessages.map((message, index) => (
                  <article key={message.author + index} className="surface-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{message.author} <span className="font-normal text-muted-foreground">· {message.role}</span></p>
                      <span className="text-xs text-muted-foreground">{message.time}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message.text}</p>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">As conversas são exemplos do protótipo, não mensagens de uma comunidade ativa.</p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="surface-card p-5 shadow-[0_12px_32px_rgba(45,75,40,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Participe</p>
              <h2 className="mt-2 font-heading text-xl font-bold text-foreground">Esse encontro combina com você?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Registre seu interesse e encontre esta tribo novamente na sua agenda de demonstração.</p>
              <div className="mt-5"><TribeRsvpButton tribeId={tribe.id} /></div>
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Quer conhecer outras comunidades?</p>
                <Button variant="outline" className="mt-3 w-full rounded-xl" render={<Link href="/explorar" />}>Explorar outras tribos</Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
