"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, PenLine } from "lucide-react";
import { FeedComposer } from "@/components/social/feed-composer";
import { apiRequest, type Tribe } from "@/lib/social-types";

export default function NewPostPage() {
  const router = useRouter();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<{ tribes: Tribe[] }>("/api/tribes?mine=true")
      .then(({ tribes: joined }) => {
        if (active) setTribes([...joined].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar suas tribos.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto w-full min-w-0 max-w-2xl space-y-5 px-3 py-5 pb-28 sm:px-6 sm:py-8">
      <Link href="/feed" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />Voltar ao feed
      </Link>
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-primary"><PenLine className="size-4" />Nova publicação</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold sm:text-3xl">O que está acontecendo?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compartilhe uma ideia, crie uma enquete ou convide sua tribo para um evento.</p>
      </header>
      {loading ? (
        <div className="flex justify-center py-12"><LoaderCircle className="size-6 animate-spin text-primary" /></div>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : tribes.length === 0 ? (
        <section className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="font-semibold">Você ainda não participa de nenhuma tribo.</p>
          <p className="mt-1 text-sm text-muted-foreground">Entre em uma comunidade para começar a publicar.</p>
          <Link href="/tribos" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Explorar tribos</Link>
        </section>
      ) : (
        <FeedComposer tribes={tribes} onPublished={async () => router.replace("/feed")} />
      )}
    </main>
  );
}
