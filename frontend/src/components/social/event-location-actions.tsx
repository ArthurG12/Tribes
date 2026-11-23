"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { googleMapsSearchUrl } from "@/lib/event-maps";

export function EventLocationActions({
  location,
  lat,
  lon,
}: {
  location: string;
  lat?: number | null;
  lon?: number | null;
}) {
  const [copyMessage, setCopyMessage] = useState("");
  const mapsUrl = googleMapsSearchUrl({ location, lat, lon });

  async function copyLocation() {
    setCopyMessage("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API indisponível.");
      await navigator.clipboard.writeText(location);
      setCopyMessage("Endereço copiado.");
    } catch {
      setCopyMessage("Não foi possível copiar o endereço. Você pode selecioná-lo e copiar manualmente.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<a href={mapsUrl} target="_blank" rel="noopener noreferrer" />}
      >
        <ExternalLink className="size-3.5" />Abrir no Google Maps
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => void copyLocation()}>
        <Copy className="size-3.5" />Copiar endereço
      </Button>
      {copyMessage && <span role="status" aria-live="polite" className="text-xs text-muted-foreground">{copyMessage}</span>}
    </div>
  );
}
