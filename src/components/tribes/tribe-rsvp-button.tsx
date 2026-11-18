"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Check, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tribes-demo-rsvps";

function readRsvps(): string[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function TribeRsvpButton({ tribeId }: { tribeId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConfirmed(readRsvps().includes(tribeId));
    setReady(true);
  }, [tribeId]);

  function toggleRsvp() {
    const current = readRsvps();
    const next = current.includes(tribeId)
      ? current.filter((id) => id !== tribeId)
      : [...current, tribeId];

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setConfirmed(next.includes(tribeId));
    } catch {
      setConfirmed(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        disabled={!ready}
        variant={confirmed ? "outline" : "default"}
        className="w-full rounded-xl font-semibold"
        onClick={toggleRsvp}
      >
        {confirmed ? <Check className="size-4" /> : <CalendarCheck className="size-4" />}
        {confirmed ? "Presença confirmada" : "Confirmar presença"}
      </Button>
      {confirmed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={toggleRsvp}
        >
          <CircleX className="size-4" /> Cancelar presença
        </Button>
      )}
    </div>
  );
}
