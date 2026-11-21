"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, UserRound, Heart, CalendarDays, Save } from "lucide-react";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_TRIBES, INTEREST_CATEGORIES } from "@/lib/tribes-data";
import { FAVORITES_KEY, readProfile, readStringList, writeProfile, type LocalProfile } from "@/lib/user-preferences";

export default function ProfilePage() {
  const [profile, setProfile] = useState<LocalProfile>({ name: "", city: "", bio: "", interests: [] });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setProfile(readProfile()); setFavorites(readStringList(FAVORITES_KEY)); }, []);
  function update<K extends keyof LocalProfile>(key: K, value: LocalProfile[K]) { setProfile(current => ({ ...current, [key]: value })); setSaved(false); }
  function toggleInterest(id: string) { update("interests", profile.interests.includes(id) ? profile.interests.filter(item => item !== id) : [...profile.interests, id]); }
  const favoriteTribes = SAMPLE_TRIBES.filter(tribe => favorites.includes(tribe.id));
  return <PageShell><PageIntro eyebrow="Sua conta" title="Meu perfil" description="Organize seus interesses e comunidades favoritas." /><section className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_320px]">
    <form className="surface-card space-y-5 p-5 sm:p-7" onSubmit={event => { event.preventDefault(); setSaved(writeProfile(profile)); }}>
      <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="size-6" /></span><div><h2 className="font-heading text-lg font-bold">Seus dados</h2><p className="text-sm text-muted-foreground">Visíveis apenas neste navegador nesta demonstração.</p></div></div>
      <label className="block space-y-2 text-sm font-medium">Nome<Input value={profile.name} onChange={event => update("name", event.target.value)} placeholder="Como podemos chamar você?" /></label>
      <label className="block space-y-2 text-sm font-medium">Cidade<Input value={profile.city} onChange={event => update("city", event.target.value)} placeholder="Sua cidade" /></label>
      <label className="block space-y-2 text-sm font-medium">Sobre você<Textarea value={profile.bio} onChange={event => update("bio", event.target.value)} placeholder="Conte um pouco sobre seus interesses..." rows={3} /></label>
      <div><p className="mb-3 text-sm font-semibold">Seus interesses</p><div className="flex flex-wrap gap-2">{INTEREST_CATEGORIES.map(item => <button key={item.id} type="button" aria-pressed={profile.interests.includes(item.id)} onClick={() => toggleInterest(item.id)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${profile.interests.includes(item.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white hover:border-primary/40"}`}>{item.shortLabel}</button>)}</div></div>
      <div className="flex flex-wrap items-center gap-3"><Button type="submit" className="gap-2"><Save className="size-4" /> Salvar perfil</Button>{saved && <span role="status" className="text-sm font-medium text-primary">Perfil salvo neste navegador.</span>}</div>
    </form>
    <aside className="space-y-4"><div className="surface-card p-5"><div className="flex items-center gap-2"><Heart className="size-5 text-primary" /><h2 className="font-heading font-bold">Favoritos</h2></div><p className="mt-1 text-3xl font-extrabold">{favoriteTribes.length}</p><p className="text-sm text-muted-foreground">comunidades salvas</p>{favoriteTribes.length ? <ul className="mt-4 space-y-3">{favoriteTribes.map(tribe => <li key={tribe.id}><Link className="text-sm font-semibold hover:text-primary" href={`/tribos/${tribe.id}`}>{tribe.name}<ArrowRight className="ml-1 inline size-3.5" /></Link></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">Seus favoritos aparecerão aqui.</p>}</div><div className="surface-card p-5"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /><h2 className="font-heading font-bold">Sua agenda</h2></div><Link href="/minha-agenda" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">Ver encontros <ArrowRight className="size-4" /></Link></div></aside>
  </section></PageShell>;
}
