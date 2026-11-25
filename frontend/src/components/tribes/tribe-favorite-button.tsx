"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FAVORITES_KEY, readStringList } from "@/lib/user-preferences";

export function TribeFavoriteButton({ tribeId, compact = false }: { tribeId: string; compact?: boolean }) {
  const [favorite, setFavorite] = useState(false);
  const [ready, setReady] = useState(false);
  // Load browser preferences after mount to keep server-rendered output deterministic.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setFavorite(readStringList(FAVORITES_KEY).includes(tribeId)); setReady(true); }, [tribeId]);
  function toggle() {
    const current = readStringList(FAVORITES_KEY);
    const next = current.includes(tribeId) ? current.filter(id => id !== tribeId) : [...current, tribeId];
    try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); setFavorite(next.includes(tribeId)); window.dispatchEvent(new Event("tribes-favorites-updated")); } catch { /* armazenamento indisponível */ }
  }
  return <Button type="button" variant={favorite ? "secondary" : "outline"} size={compact ? "icon" : "sm"} disabled={!ready} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-pressed={favorite} onClick={toggle} className={compact ? "size-9 rounded-full" : "gap-2 rounded-full"}><Heart className={favorite ? "size-4 fill-current text-primary" : "size-4"} />{compact ? null : favorite ? "Salva" : "Favoritar"}</Button>;
}
