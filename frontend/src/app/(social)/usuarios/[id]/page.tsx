"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, MapPin, UserRound } from "lucide-react";
import { UserAvatar } from "@/components/social/user-avatar";
import { apiRequest, type PublicProfile } from "@/lib/social-types";

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loadedId, setLoadedId] = useState("");
  const [error, setError] = useState("");
  const loading = loadedId !== id;

  useEffect(() => {
    let active = true;
    apiRequest<{ profile: PublicProfile }>(`/api/users/${encodeURIComponent(id)}/profile`)
      .then(({ profile: loadedProfile }) => {
        if (!active) return;
        setProfile(loadedProfile);
        setError("");
      })
      .catch((loadError) => {
        if (!active) return;
        setProfile(null);
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar este perfil.");
      })
      .finally(() => { if (active) setLoadedId(id); });
    return () => { active = false; };
  }, [id]);


  return (
    <main className="mx-auto max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" render={<Link href="/feed" />}><ArrowLeft className="size-4" />Voltar ao feed</Button>
      {loading ? (
        <div className="flex justify-center py-20"><LoaderCircle className="size-7 animate-spin text-primary" aria-label="Carregando perfil" /></div>
      ) : error ? (
        <section className="rounded-3xl border border-border bg-card px-5 py-12 text-center">
          <UserRound className="mx-auto size-8 text-muted-foreground" />
          <p role="alert" className="mt-3 text-sm text-muted-foreground">{error}</p>
        </section>
      ) : profile ? (
        <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
          <div className="h-28 bg-gradient-to-r from-primary/15 via-accent to-primary/5" />
          <div className="px-5 pb-8 sm:px-8">
            <div className="-mt-14 flex size-28 items-center justify-center rounded-full border-4 border-card bg-card">
              <UserAvatar name={profile.name} avatarUrl={profile.avatarUrl} className="size-full text-3xl" />
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="break-words font-heading text-3xl font-extrabold">{profile.name}</h1>
                {profile.city && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0 text-primary" />{profile.city}</p>}
              </div>
            </div>
            {profile.interests.length > 0 && (
              <section className="mt-6">
                <h2 className="font-heading text-lg font-bold">Interesses</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.interests.map((interest) => <span key={interest} className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">{interest}</span>)}
                </div>
              </section>
            )}
            <section className="mt-6 border-t border-border pt-5">
              <h2 className="font-heading text-lg font-bold">Sobre mim</h2>
              {profile.aboutMe ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{profile.aboutMe}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Esta pessoa ainda não adicionou uma descrição.</p>
              )}
            </section>
          </div>
        </article>
      ) : null}
    </main>
  );
}
