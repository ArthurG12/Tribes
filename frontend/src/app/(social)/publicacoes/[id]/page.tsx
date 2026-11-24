"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { FeedItemCard } from "@/components/social/feed-item-card";
import { Button } from "@/components/ui/button";
import { apiRequest, type FeedItem } from "@/lib/social-types";

export default function PublicationPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<FeedItem | null>(null);
  const [loadedId, setLoadedId] = useState("");
  const [error, setError] = useState("");
  const loading = loadedId !== id;

  useEffect(() => {
    let active = true;
    apiRequest<{ item: FeedItem }>(`/api/content/${encodeURIComponent(id)}`)
      .then(({ item: loadedItem }) => {
        if (!active) return;
        setItem(loadedItem);
        setError("");
      })
      .catch((loadError) => {
        if (!active) return;
        setItem(null);
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar esta publicação.");
      })
      .finally(() => { if (active) setLoadedId(id); });
    return () => { active = false; };
  }, [id]);

  function updateItem(itemId: string, update: (current: FeedItem) => FeedItem) {
    setItem((current) => current?.id === itemId ? update(current) : current);
  }

  function removeItem(itemId: string) {
    if (item?.id === itemId) {
      setItem(null);
      setError("Esta publicação foi removida.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5">
      <Button variant="ghost" size="sm" render={<Link href="/feed" />}>
        <ArrowLeft className="size-4" />Voltar ao feed
      </Button>
      {loading ? (
        <div className="flex justify-center py-20"><LoaderCircle className="size-7 animate-spin text-primary" aria-label="Carregando publicação" /></div>
      ) : error ? (
        <section className="rounded-3xl border border-border bg-card px-5 py-12 text-center">
          <p role="alert" className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" nativeButton={false} render={<Link href="/feed" />} className="mt-5">Ir para o feed</Button>
        </section>
      ) : item ? (
        <FeedItemCard item={item} onUpdateItem={updateItem} onError={setError} onRemoveItem={removeItem} />
      ) : null}
    </main>
  );
}
