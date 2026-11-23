"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, MapPin, Users, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/social/user-avatar";
import { apiRequest, type Tribe } from "@/lib/social-types";

type TribeMember = {
  id: string;
  name: string;
  aboutMe: string;
  city: string;
  interests: string[];
  isOwner: boolean;
  avatarUrl: string | null;
};

export default function TribeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [members, setMembers] = useState<TribeMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest<{ tribes: (Tribe & { isOwner?: boolean })[] }>("/api/tribes?mine=true"),
      apiRequest<{ members: TribeMember[] }>(`/api/tribes/${id}/members`),
    ]).then(([tribeResult, memberResult]) => {
      if (!active) return;
      const current = tribeResult.tribes.find((item) => item.id === id);
      if (!current) {
        setError("Esta tribo não foi encontrada ou você não participa dela.");
        return;
      }
      setTribe(current);
      setIsOwner(current.isOwner === true);
      setMembers(memberResult.members);
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
            {isOwner && <Button nativeButton={false} render={<Link href={`/minhas-tribos/${tribe.id}`} />} variant="outline" className="shrink-0"><Pencil className="size-4" />Gerenciar tribo</Button>}
          </div>
          <Button nativeButton={false} render={<Link href={`/feed?tribeId=${tribe.id}`} />} className="mt-5 w-full sm:w-auto">Ver publicações e eventos</Button>
        </section>
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
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
        </section>
      </>}
    </main>
  );
}
