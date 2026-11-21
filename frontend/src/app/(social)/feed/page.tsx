"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, Send, Users } from "lucide-react";
import { FeedComposer } from "@/components/social/feed-composer";
import { FeedItemCard } from "@/components/social/feed-item-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest, type FeedItem, type Tribe } from "@/lib/social-types";

const PAGE_SIZE = 20;

export default function FeedPage() {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribe, setSelectedTribe] = useState("all");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const fetchPage = useCallback(async (cursor?: string, replace = false) => {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (selectedTribe !== "all") query.set("tribeId", selectedTribe);
    if (cursor) query.set("cursor", cursor);
    const result = await apiRequest<{ items: FeedItem[]; nextCursor: string | null }>(`/api/feed?${query}`);
    setItems((existing) => replace ? result.items : [...existing, ...result.items]);
    setNextCursor(result.nextCursor);
  }, [selectedTribe]);

  useEffect(() => {
    let active = true;
    apiRequest<{ tribes: Tribe[] }>("/api/tribes?mine=true")
      .then(({ tribes: joined }) => {
        if (!active) return;
        setError("");
        setTribes(joined);
        setItems([]);
        setNextCursor(null);
        return fetchPage(undefined, true);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o feed.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchPage]);

  function updateItem(itemId: string, update: (current: FeedItem) => FeedItem) {
    setItems((current) => current.map((item) => item.id === itemId ? update(item) : item));
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <FeedComposer
        tribes={tribes}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        error={error}
        onError={setError}
        onPublished={() => fetchPage(undefined, true)}
      />
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge className="bg-primary/10 text-primary">Sua comunidade</Badge>
          <h1 className="mt-2 font-heading text-3xl font-extrabold">Feed das suas tribos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Publicações e eventos, em ordem cronológica.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/tribos" />}><Users className="size-4" />Explorar</Button>
          <Button variant="outline" onClick={() => setComposerOpen(true)}><Send className="size-4" />Publicar</Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/tribos/nova" />}><Plus className="size-4" />Criar tribo</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <label htmlFor="tribe-filter" className="mb-2 block text-sm font-semibold">Filtrar feed</label>
        <select id="tribe-filter" value={selectedTribe} onChange={(event) => { setLoading(true); setSelectedTribe(event.target.value); }}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="all">Todas as tribos</option>
          {tribes.map((tribe) => <option key={tribe.id} value={tribe.id}>{tribe.name}</option>)}
        </select>
      </section>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><LoaderCircle className="size-6 animate-spin text-primary" /></div> : items.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users className="size-6" /></div>
          <h2 className="mt-4 font-heading text-xl font-bold">{tribes.length ? "Seu feed está começando" : "Encontre sua primeira tribo"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{tribes.length ? "Quando alguém publicar ou criar um evento, ele aparecerá aqui." : "Explore comunidades por interesse ou crie uma nova para começar a compartilhar."}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button nativeButton={false} render={<Link href="/tribos" />}>Buscar tribos</Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/tribos/nova" />}>Criar tribo</Button>
          </div>
        </section>
      ) : <div className="space-y-4">
        {items.map((item) => <FeedItemCard key={item.id} item={item} onUpdateItem={updateItem} onError={setError} />)}
      </div>}
      {!loading && nextCursor && <div className="flex justify-center"><Button variant="outline" disabled={loadingMore} onClick={async () => { setLoadingMore(true); try { await fetchPage(nextCursor); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Erro ao carregar mais itens."); } finally { setLoadingMore(false); } }}>{loadingMore && <LoaderCircle className="size-4 animate-spin" />}Carregar mais</Button></div>}
    </main>
  );
}
