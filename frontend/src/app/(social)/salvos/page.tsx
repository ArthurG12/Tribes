"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, LoaderCircle, Search } from "lucide-react";
import { FeedItemCard } from "@/components/social/feed-item-card";
import { Button } from "@/components/ui/button";
import { apiRequest, type FeedItem } from "@/lib/social-types";

export default function SavedPostsPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const load = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (search) params.set("q", search);
    if (cursor) params.set("cursor", cursor);
    return apiRequest<{ items: FeedItem[]; nextCursor: string | null }>(`/api/saved?${params}`);
  }, [search]);

  useEffect(() => {
    let active = true;
    requestSequence.current += 1;
    setLoading(true);
    setError("");
    load()
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setNextCursor(result.nextCursor);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar os salvos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [load]);

  function updateItem(id: string, update: (item: FeedItem) => FeedItem) {
    setItems((current) => current.map((item) => item.id === id ? update(item) : item).filter((item) => item.savedByMe));
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const requestId = requestSequence.current;
      const result = await load(nextCursor);
      if (requestId !== requestSequence.current) return;
      setItems((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar mais publicações.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="size-4" />
        Voltar ao feed
      </Link>
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Sua coleção</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold">Publicações salvas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Guarde publicações e eventos para encontrar depois.</p>
      </section>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Pesquisar publicações salvas" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar nos salvos..." className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {loading ? <div className="flex justify-center py-12"><LoaderCircle className="size-6 animate-spin text-primary" /></div> : items.length ? (
        <div className="space-y-4">
          {items.map((item) => <FeedItemCard key={item.id} item={item} onUpdateItem={updateItem} onError={setError} onRemoveItem={(id) => setItems((current) => current.filter((entry) => entry.id !== id))} />)}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <Bookmark className="mx-auto size-8 text-primary" />
          <h2 className="mt-3 font-heading text-xl font-bold">{search ? "Nenhum resultado" : "Nada salvo ainda"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{search ? "Tente outro termo." : "Use o botão Salvar nas publicações do feed para montar sua coleção."}</p>
        </section>
      )}
      {!loading && nextCursor && <div className="flex justify-center"><Button variant="outline" disabled={loadingMore || query.trim() !== search || loading} onClick={() => void loadMore()}>{loadingMore && <LoaderCircle className="size-4 animate-spin" />}Carregar mais</Button></div>}
    </main>
  );
}
