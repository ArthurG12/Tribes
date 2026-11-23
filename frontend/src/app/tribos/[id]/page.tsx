"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, type Tribe } from "@/lib/social-types";

function TribeDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ tribe: Tribe }>(`/api/tribes/${id}`).then(({ tribe: current }) => {
      if (!active) return;
      setTribe(current);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível abrir esta tribo.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="flex justify-center py-20"><LoaderCircle className="size-6 animate-spin text-primary" /></main>;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6">
      <Link href="/minhas-tribos" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Voltar para minhas tribos</Link>
      {error || !tribe ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error || "Tribo não encontrada."}</p> : <>
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Badge variant="secondary">{tribe.category}</Badge>
              <h1 className="mt-3 break-words font-heading text-2xl font-extrabold sm:text-3xl">{tribe.name}</h1>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{tribe.description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="size-4 text-primary" />{[tribe.neighborhood, tribe.city].filter(Boolean).join(" · ")}</span>
                <span className="inline-flex items-center gap-1"><Users className="size-4 text-primary" />{tribe.memberCount} membros</span>
              </div>
            </div>

          </div>
          <Button nativeButton={false} render={<Link href={`/feed?tribeId=${tribe.id}`} />} className="mt-5 w-full sm:w-auto">Ver publicações e eventos</Button>
        </section>

      </>}
    </main>
  );
}


export default function TribeDetailPage() {
  return (
    <Suspense fallback={<main className="flex justify-center py-20"><LoaderCircle className="size-6 animate-spin text-primary" /></main>}>
      <TribeDetailContent />
    </Suspense>
  );
}
