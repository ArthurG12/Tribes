"use client";

import { useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Pin,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HeroMockupProps {
  onInteract?: () => void;
}

export function HeroMockup({ onInteract }: HeroMockupProps) {
  const [rsvpConfirmed, setRsvpConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState<"evento" | "chat">("evento");

  const confirmedCount = rsvpConfirmed ? 15 : 14;

  const handleToggleRsvp = () => {
    setRsvpConfirmed((prev) => !prev);
    onInteract?.();
  };

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 -z-10 rounded-4xl bg-gradient-to-tr from-[#c4f36a]/20 via-orange-500/10 to-transparent blur-2xl"
      />

      <div className="overflow-hidden rounded-xl border border-[#c8d3be] bg-[#e3e9dc] shadow-[0_16px_40px_rgba(48,66,45,0.09)] ring-1 ring-white/[0.04] ">
        {/* Top bar of tribe room */}
        <div className="flex items-center justify-between border-b border-[#c8d3be] bg-[#dce4d3] px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 font-heading text-sm font-bold text-primary">
              D&D
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-sm font-bold text-foreground">
                  Dados & Dragões Pampulha
                </span>
                <ShieldCheck className="size-4 text-[#657f4f]" />
              </div>
              <p className="text-xs text-muted-foreground">
                Belo Horizonte · 34 membros ativos
              </p>
            </div>
          </div>
          <Badge className="border-emerald-600/20 border border-[#aebe92] bg-[#dce7ce] text-[#536c43] hover:bg-[#d6e2c8]">
            Aberto p/ iniciantes
          </Badge>
        </div>

        {/* Mode switcher: Pinned Event vs Organized Chat */}
        <div className="grid grid-cols-2 gap-1 border-b border-[#c8d3be] bg-[#d8e1cf] p-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab("evento");
              onInteract?.();
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
              activeTab === "evento"
                ? "bg-[#a9c47c] text-[#344b39] shadow-[0_3px_0_#91a96a]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pin className="size-3.5 text-primary" />
            Próximo Encontro Fixado
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("chat");
              onInteract?.();
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-[#a9c47c] text-[#344b39] shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="size-3.5" />
            Conversa sem ruído (2)
          </button>
        </div>

        {activeTab === "evento" ? (
          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-2xl border border-primary/35 bg-[#d4dfc9] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="size-3.5" />
                  Nunca se perde no chat
                </span>
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {confirmedCount}/18 vagas
                </span>
              </div>

              <h3 className="font-heading text-base font-bold text-foreground">
                Tarde de One-Shots D&D 5e + Board Games
              </h3>

              <div className="mt-3 space-y-2 text-xs text-foreground/85">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 shrink-0 text-primary" />
                  <span>Sábado, 14h30 às 18h30 · Recepção novatos às 14h15</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <span>Tabuleiro Café · Pampulha (Point Verificado)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 shrink-0 text-primary" />
                  <span>2 mesas iniciantes + 1 mesa veteranos · Fichas prontas</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.round((confirmedCount / 18) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Interactive RSVP test */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex -space-x-2">
                {["MS", "LT", "CA", "IG", rsvpConfirmed ? "VC" : "+10"].map((initials, idx) => (
                  <div
                    key={initials + idx}
                    className={`flex size-8 items-center justify-center rounded-full border-2 border-card text-[11px] font-bold ${
                      initials === "VC"
                        ? "bg-[#a9c47c] text-[#344b39]"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {initials}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                size="lg"
                variant={rsvpConfirmed ? "secondary" : "default"}
                onClick={handleToggleRsvp}
                className="rounded-xl font-semibold"
              >
                {rsvpConfirmed ? (
                  <>
                    <CheckCircle2 className="size-4 text-[#657f4f]" />
                    Presença confirmada!
                  </>
                ) : (
                  "Confirmar presença em 1 clique"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4 sm:p-5">
            <div className="rounded-xl border border-[#c8d3be] bg-white p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Marina S. · Organizadora
                </span>
                <span className="text-[11px] text-muted-foreground">há 18 min</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Subi as fichas prontas direto no card do encontro! Assim ninguém precisa rolar 200 mensagens pra achar horário ou endereço.
              </p>
            </div>
            <div className="rounded-xl border border-[#c8d3be] bg-[#dce4d3] p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Lucas T. · 1º encontro na tribo
                </span>
                <span className="text-[11px] text-muted-foreground">há 7 min</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Sempre tive receio de entrar em grupo fechado onde todo mundo já se conhece. O filtro de iniciantes salvou demais!
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-dashed border-[#bfd49f] px-3 py-2 text-[11px] text-muted-foreground">
              <span>Data, mapa e lista de confirmação permanecem fixos na aba ao lado.</span>
              <button
                type="button"
                onClick={() => setActiveTab("evento")}
                className="font-semibold text-primary hover:underline"
              >
                Ver card
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
