"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TribeShareButton({ tribeName }: { tribeName: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${tribeName} | Tribes`, text: `Conheça a comunidade ${tribeName} na Tribes.`, url }); return; }
      catch (error) { if (error instanceof Error && error.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copie o link da comunidade:", url);
    }
  }
  return <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={share}>{copied ? <Check className="size-4" /> : <Share2 className="size-4" />}{copied ? "Link copiado" : "Compartilhar"}</Button>;
}
