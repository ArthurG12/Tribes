"use client";

import { useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Pin,
  Store,
} from "lucide-react";
import {
  INTEREST_CATEGORIES,
  SAMPLE_TRIBES,
  type InterestId,
  type TribePreview,
} from "@/lib/tribes-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TribeExplorerProps {
  onSelectTribeForWaitlist: (tribe: TribePreview) => void;
  onExplorerInteract: (interest?: InterestId) => void;
}

const FEATURED_FILTERS: { id: "todos" | InterestId; label: string }[] = [
  { id: "todos", label: "Todas as tribos" },
  { id: "esportes", label: "Esportes & Corrida" },
  { id: "rpg", label: "RPG & Board Games" },
  { id: "games", label: "Games & Co-op" },
  { id: "leitura", label: "Leitura" },
  { id: "programacao", label: "Programação & IA" },
  { id: "cultura-geek", label: "Cinema & Anime" },
];

export function TribeExplorer({
  onSelectTribeForWaitlist,
  onExplorerInteract,
}: TribeExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<"todos" | InterestId>("todos");
  const [selectedFormat, setSelectedFormat] = useState<"Todos" | "Presencial" | "Híbrido" | "Online">("Todos");
  const [onlyBeginners, setOnlyBeginners] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTribe, setActiveTribe] = useState<TribePreview | null>(null);

  const filteredTribes = useMemo(() => {
    return SAMPLE_TRIBES.filter((tribe) => {
      if (selectedCategory !== "todos" && tribe.category !== selectedCategory) {
        return false;
      }
      if (selectedFormat !== "Todos" && tribe.format !== selectedFormat) {
        return false;
      }
      if (onlyBeginners && !tribe.beginnerFriendly) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack =
          `${tribe.name} ${tribe.tagline} ${tribe.neighborhood} ${tribe.categoryLabel} ${tribe.nextEvent.title}`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [selectedCategory, selectedFormat, onlyBeginners, searchQuery]);

  const handleCategoryClick = (cat: "todos" | InterestId) => {
    setSelectedCategory(cat);
    onExplorerInteract(cat === "todos" ? undefined : cat);
  };

  const handleOpenTribe = (tribe: TribePreview) => {
    setActiveTribe(tribe);
    onExplorerInteract(tribe.category);
  };

  return (
    <section id="explorar" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-3 border-primary/30 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary"
          >
            Protótipo Interativo · Experimente agora
          </Badge>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Explore como funcionam as tribos na prática
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Filtre pelos seus hobbies, veja a agenda do próximo encontro fixado e reserve seu acesso nas comunidades inaugurais.
          </p>
        </div>

        {/* Search + Format + Beginner filter bar */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por hobby, bairro (ex: Pampulha, Savassi) ou atividade..."
                className="h-10 rounded-xl pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["Todos", "Presencial", "Híbrido", "Online"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    setSelectedFormat(fmt);
                    onExplorerInteract();
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedFormat === fmt
                      ? "bg-foreground text-background"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {fmt}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setOnlyBeginners((prev) => !prev);
                  onExplorerInteract();
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                  onlyBeginners
                    ? "border-brand-green bg-brand-green text-white"
                    : "border-brand-green/30 bg-brand-green/8 text-brand-green-dark hover:bg-brand-green/15"
                }`}
              >
                <Sparkles className="size-3.5" />
                Aberto p/ iniciantes
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-border/70 pt-3.5">
            {FEATURED_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => handleCategoryClick(filter.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === filter.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tribe cards grid */}
        {filteredTribes.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-heading text-lg font-bold text-foreground">
              Ainda não listamos uma tribo com esse filtro exato na vitrine inicial
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Quer fundar ou sugerir essa comunidade na sua região? Entre na lista como organizador ou participante e nós conectamos os primeiros membros!
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory("todos");
                  setSelectedFormat("Todos");
                  setOnlyBeginners(false);
                  setSearchQuery("");
                }}
              >
                Limpar filtros
              </Button>
              <Button render={<a href="#lista-espera" />}>
                Sugerir nova tribo no lançamento
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTribes.map((tribe) => {
              const spotsLeft = tribe.nextEvent.maxSpots - tribe.nextEvent.confirmedCount;
              return (
                <article
                  key={tribe.id}
                  className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary" className="font-medium">
                        {tribe.categoryLabel}
                      </Badge>
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {tribe.format}
                      </span>
                    </div>

                    <h3 className="mt-3.5 font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {tribe.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {tribe.tagline}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5 text-primary" />
                        {tribe.neighborhood}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 text-primary" />
                        {tribe.membersCount} membros
                      </span>
                    </div>

                    {/* Mini pinned event preview */}
                    <div className="mt-4 rounded-2xl border border-border/80 bg-secondary/45 p-3.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {tribe.nextEvent.dateLabel}
                        </span>
                        <span className="text-brand-green-dark">
                          {spotsLeft} vagas
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs font-semibold text-foreground">
                        {tribe.nextEvent.title}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {tribe.nextEvent.locationLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
                    {tribe.beginnerFriendly ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-green-dark">
                        <CheckCircle2 className="size-3.5" />
                        Iniciantes bem-vindos
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {tribe.weeklyFrequency}
                      </span>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleOpenTribe(tribe)}
                    >
                      Ver detalhes
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Extra Categories Counter Strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Categorias mapeadas na validação inicial:</span>
          {INTEREST_CATEGORIES.map((cat) => (
            <span
              key={cat.id}
              className="rounded-full border border-border bg-card px-2.5 py-1 font-medium text-foreground/80"
            >
              {cat.shortLabel}
            </span>
          ))}
        </div>
      </div>

      {/* Modal detail of selected tribe */}
      <Dialog
        open={Boolean(activeTribe)}
        onOpenChange={(open) => {
          if (!open) setActiveTribe(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:max-w-lg">
          {activeTribe && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{activeTribe.categoryLabel}</Badge>
                  <Badge variant="outline">{activeTribe.format}</Badge>
                  {activeTribe.beginnerFriendly && (
                    <Badge className="bg-brand-green/15 text-brand-green-dark">
                      Aberto p/ iniciantes
                    </Badge>
                  )}
                </div>
                <DialogTitle className="mt-2 font-heading text-xl font-extrabold">
                  {activeTribe.name}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {activeTribe.tagline}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 space-y-4">
                <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="inline-flex items-center gap-1">
                      <Pin className="size-3.5" />
                      Card de Encontro Fixado
                    </span>
                    <span className="font-mono">
                      {activeTribe.nextEvent.confirmedCount}/{activeTribe.nextEvent.maxSpots} confirmados
                    </span>
                  </div>
                  <h4 className="mt-1.5 font-heading text-base font-bold text-foreground">
                    {activeTribe.nextEvent.title}
                  </h4>
                  <div className="mt-2.5 space-y-1.5 text-xs text-foreground/85">
                    <p className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-primary" />
                      {activeTribe.nextEvent.dateLabel} ({activeTribe.weeklyFrequency})
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-primary" />
                      {activeTribe.nextEvent.locationLabel}
                    </p>
                    <p className="flex items-center gap-2 font-medium text-brand-green-dark">
                      <Sparkles className="size-3.5" />
                      Custo: {activeTribe.nextEvent.costLabel}
                    </p>
                  </div>

                  <ul className="mt-3 space-y-1.5 border-t border-primary/15 pt-3 text-xs text-muted-foreground">
                    {activeTribe.nextEvent.pinnedNotes.map((note) => (
                      <li key={note} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {activeTribe.partnerVenue && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-xs">
                    <Store className="size-4 shrink-0 text-primary" />
                    <span>
                      Encontro realizado em <strong>{activeTribe.partnerVenue}</strong> · Organizado por{" "}
                      <strong>{activeTribe.organizerName}</strong>
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Últimas mensagens da tribo
                  </p>
                  {activeTribe.recentMessages.map((msg, index) => (
                    <div key={msg.author + index} className="rounded-xl bg-muted/60 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {msg.author} · <span className="font-normal text-muted-foreground">{msg.role}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{msg.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTribe(null)}
                  >
                    Continuar explorando
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-xl font-semibold"
                    onClick={() => {
                      const chosen = activeTribe;
                      setActiveTribe(null);
                      onSelectTribeForWaitlist(chosen);
                    }}
                  >
                    Participar desta tribo no lançamento
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
