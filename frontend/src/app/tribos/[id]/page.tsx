"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, CheckCircle2, LoaderCircle, MapPin, Pencil, Pin, Sparkles, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/social/user-avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { apiRequest, type Tribe } from "@/lib/social-types";
import { SAMPLE_TRIBES, type TribePreview } from "@/lib/tribes-data";

type TribeMember = {
  id: string;
  name: string;
  aboutMe: string;
  city: string;
  interests: string[];
  isOwner: boolean;
  avatarUrl: string | null;
};

function TribeDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [sampleTribe, setSampleTribe] = useState<TribePreview | null>(null);
  const [members, setMembers] = useState<TribeMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const sample = SAMPLE_TRIBES.find((item) => item.id === id);
    if (sample) {
      setSampleTribe(sample);
      setTribe({
        id: sample.id,
        name: sample.name,
        description: sample.tagline,
        category: sample.categoryLabel,
        format: sample.format,
        city: sample.city,
        neighborhood: sample.neighborhood,
        createdAt: "",
        memberCount: sample.membersCount,
        isMember: false,
      });
      setLoading(false);
      return () => { active = false; };
    }

    setSampleTribe(null);
    apiRequest<{ tribe: Tribe }>(`/api/tribes/${id}`).then(async ({ tribe: current }) => {
      if (!active) return;
      setTribe(current);
      const [tribeResult, memberResult] = await Promise.allSettled([
        apiRequest<{ tribes: (Tribe & { isOwner?: boolean })[] }>("/api/tribes?mine=true"),
        apiRequest<{ members: TribeMember[] }>(`/api/tribes/${id}/members`),
      ]);
      if (!active) return;
      if (tribeResult.status === "fulfilled") {
        const membership = tribeResult.value.tribes.find((item) => item.id === id);
        setIsOwner(membership?.isOwner === true);
      }
      if (memberResult.status === "fulfilled") setMembers(memberResult.value.members);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir esta tribo.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const isSampleTribe = Boolean(sampleTribe);

  if (loading) return <main className="flex justify-center py-20"><LoaderCircle className="size-6 animate-spin text-primary" /></main>;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Voltar para a página inicial</Link>
      {error || !tribe ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error || "Tribo não encontrada."}</p> : <>
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{tribe.category}</Badge>
                {sampleTribe && <Badge variant="outline">{sampleTribe.format}</Badge>}
                {sampleTribe?.beginnerFriendly && <Badge className="bg-primary/10 text-primary">Aberto para iniciantes</Badge>}
              </div>
              <h1 className="mt-3 break-words font-heading text-2xl font-extrabold sm:text-3xl">{tribe.name}</h1>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{tribe.description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="size-4 text-primary" />{[tribe.neighborhood, tribe.city].filter(Boolean).join(" · ")}</span>
                <span className="inline-flex items-center gap-1"><Users className="size-4 text-primary" />{tribe.memberCount} membros</span>
                {sampleTribe && <span>{sampleTribe.weeklyFrequency}</span>}
              </div>
            </div>
            {isOwner && <Button nativeButton={false} render={<Link href={`/minhas-tribos/${tribe.id}`} />} variant="outline" className="shrink-0"><Pencil className="size-4" />Gerenciar tribo</Button>}
          </div>
          {!isSampleTribe && <Button nativeButton={false} render={<Link href={`/feed?tribeId=${tribe.id}`} />} className="mt-5 w-full sm:w-auto">Ver publicações e eventos</Button>}
        </section>

        {sampleTribe && <>
          <section className="rounded-3xl border border-primary/25 bg-card p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-primary">
              <span className="inline-flex items-center gap-1"><Pin className="size-4" />Card de encontro em destaque</span>
              <span>{sampleTribe.nextEvent.confirmedCount}/{sampleTribe.nextEvent.maxSpots} confirmados</span>
            </div>
            <h2 className="mt-3 font-heading text-xl font-bold">{sampleTribe.nextEvent.title}</h2>
            <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <p className="flex items-start gap-2"><Calendar className="mt-0.5 size-4 shrink-0 text-primary" />{sampleTribe.nextEvent.dateLabel} · {sampleTribe.weeklyFrequency}</p>
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" />{sampleTribe.nextEvent.locationLabel}</p>
              <p className="flex items-start gap-2"><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />Custo: {sampleTribe.nextEvent.costLabel}</p>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Informações importantes</h3>
              <ul className="mt-3 space-y-2">
                {sampleTribe.nextEvent.pinnedNotes.map((note) => <li key={note} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>{note}</span></li>)}
              </ul>
            </div>
          </section>

          {sampleTribe.partnerVenue && <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <Store className="size-5 shrink-0 text-primary" />
            <p>Local parceiro: <strong>{sampleTribe.partnerVenue}</strong><br /><span className="text-muted-foreground">Organizado por {sampleTribe.organizerName}</span></p>
          </section>}

          <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
            <h2 className="font-heading text-xl font-bold">Últimas mensagens da tribo</h2>
            <div className="mt-4 space-y-3">
              {sampleTribe.recentMessages.map((message, index) => <article key={message.author + index} className="rounded-2xl bg-muted/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{message.author} <span className="font-normal text-muted-foreground">· {message.role}</span></p>
                  <span className="text-xs text-muted-foreground">{message.time}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message.text}</p>
              </article>)}
            </div>
          </section>
        </>}

        {!isSampleTribe && <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-heading text-xl font-bold">Ver membros</h2><p className="mt-1 text-sm text-muted-foreground">{members.length} participantes</p></div>
            <Badge variant="outline"><Users className="size-3" />{members.length}</Badge>
          </div>
          <div className="mt-4 divide-y divide-border">
            {members.map((member) => <div key={member.id} className="flex min-w-0 items-center gap-3 py-3">
              <UserAvatar name={member.name} avatarUrl={member.avatarUrl} />
              <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{member.name}</p>{member.city && <p className="text-xs text-muted-foreground">{member.city}</p>}</div>
              {member.isOwner && <Badge variant="secondary">Criador</Badge>}
            </div>)}
            {!members.length && <p className="py-6 text-sm text-muted-foreground">Ainda não há membros para exibir.</p>}
          </div>
        </section>}
      </>}
    </main>
  );
}

export default function TribeDetailPage() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto mb-4 flex max-w-4xl justify-end">
        <ThemeToggle />
      </div>
      <Suspense fallback={<main className="flex justify-center py-20"><LoaderCircle className="size-6 animate-spin text-primary" /></main>}>
        <TribeDetailContent />
      </Suspense>
    </div>
  );
}
