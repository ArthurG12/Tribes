"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { TribeFavoriteButton } from "@/components/tribes/tribe-favorite-button";
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
  onSelectTribeForSignup: (tribe: TribePreview) => void;
  onExplorerInteract: (interest?: InterestId) => void;
  compact?: boolean;
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
  onSelectTribeForSignup,
  onExplorerInteract,
  compact = false,
}: TribeExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<"todos" | InterestId>("todos");
  const [selectedFormat, setSelectedFormat] = useState<"Todos" | "Presencial" | "Híbrido" | "Online">("Todos");
  const [onlyBeginners, setOnlyBeginners] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"relevancia" | "membros" | "nome">("relevancia");
  const [urlReady, setUrlReady] = useState(false);
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

  const sortedTribes = useMemo(() => [...filteredTribes].sort((a, b) => sortBy === "membros" ? b.membersCount - a.membersCount : sortBy === "nome" ? a.name.localeCompare(b.name, "pt-BR") : 0), [filteredTribes, sortBy]);
  const displayedTribes = compact ? sortedTribes.slice(0, 3) : sortedTribes;

  useEffect(() => {
    if (compact) return;
    const params = new URLSearchParams(window.location.search);
    const category = params.get("categoria");
    const format = params.get("formato");
    const query = params.get("busca");
    const sort = params.get("ordem");
    if (category === "todos" || INTEREST_CATEGORIES.some(item => item.id === category)) setSelectedCategory(category as "todos" | InterestId);
    if (format === "Presencial" || format === "Híbrido" || format === "Online") setSelectedFormat(format);
    if (query) setSearchQuery(query);
    if (params.get("iniciantes") === "1") setOnlyBeginners(true);
    if (sort === "membros" || sort === "nome") setSortBy(sort);
    setUrlReady(true);
  }, [compact]);

  useEffect(() => {
    if (compact || !urlReady) return;
    const params = new URLSearchParams();
    if (selectedCategory !== "todos") params.set("categoria", selectedCategory);
    if (selectedFormat !== "Todos") params.set("formato", selectedFormat);
    if (searchQuery.trim()) params.set("busca", searchQuery.trim());
    if (sortBy !== "relevancia") params.set("ordem", sortBy);
    if (onlyBeginners) params.set("iniciantes", "1");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/explorar?${query}` : "/explorar");
  }, [compact, urlReady, selectedCategory, selectedFormat, searchQuery, sortBy, onlyBeginners]);

  const activeFilterCount = Number(selectedCategory !== "todos") + Number(selectedFormat !== "Todos") + Number(onlyBeginners) + Number(searchQuery.trim().length > 0);

  const handleCategoryClick = (cat: "todos" | InterestId) => {
    setSelectedCategory(cat);
    onExplorerInteract(cat === "todos" ? undefined : cat);
  };

  const handleOpenTribe = (tribe: TribePreview) => {
    setActiveTribe(tribe);
    onExplorerInteract(tribe.category);
  };

  return (
    <section id="explorar" className="pt-2 pb-20 sm:pt-4 sm:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {!compact && <>
        {/* Search + Format + Beginner filter bar */}
        <div className="mt-0 rounded-2xl border border-border bg-card p-4 shadow-[0_12px_32px_rgba(65,35,30,0.06)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); onExplorerInteract(); }}
                placeholder="Buscar por hobby, bairro (ex: Pampulha, Savassi) ou atividade..."
                className="h-10 rounded-xl pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["Todos", "Presencial", "Híbrido", "Online"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  aria-pressed={selectedFormat === fmt}
                  onClick={() => {
                    setSelectedFormat(fmt);
                    onExplorerInteract();
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedFormat === fmt
                      ? "bg-foreground text-background"
                      : "bg-secondary text-foreground/75 hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {fmt}
                </button>
              ))}

              <button
                type="button"
                aria-pressed={onlyBeginners}
                onClick={() => {
                  setOnlyBeginners((prev) => !prev);
                  onExplorerInteract();
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                  onlyBeginners
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-primary hover:bg-accent"
                }`}
              >
                <Sparkles className="size-3.5" />
                Aberto p/ iniciantes
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3.5 text-xs">
            <span className="font-medium text-muted-foreground">{filteredTribes.length} {filteredTribes.length === 1 ? "tribo encontrada" : "tribos encontradas"}{activeFilterCount > 0 ? ` · ${activeFilterCount} filtros ativos` : " · vitrine completa"}</span>
            <div className="flex flex-wrap items-center gap-3">{activeFilterCount > 0 && <button type="button" onClick={() => { setSelectedCategory("todos"); setSelectedFormat("Todos"); setOnlyBeginners(false); setSearchQuery(""); setSortBy("relevancia"); }} className="font-bold text-primary underline decoration-dotted underline-offset-4 hover:text-primary">Limpar filtros</button>}<label className="flex items-center gap-2 text-muted-foreground">Ordenar <select aria-label="Ordenar comunidades" value={sortBy} onChange={event => setSortBy(event.target.value as "relevancia" | "membros" | "nome")} className="rounded-lg border border-border bg-background px-2.5 py-1.5 font-semibold text-foreground"><option value="relevancia">Relevância</option><option value="membros">Mais populares</option><option value="nome">Nome</option></select></label></div>
          </div>

          {/* Category pills */}
          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-border/70 pt-3.5">
            {FEATURED_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={selectedCategory === filter.id}
                onClick={() => handleCategoryClick(filter.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === filter.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-secondary text-foreground/75 hover:bg-accent hover:text-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        </>}

        {displayedTribes.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-primary/30 bg-card px-6 py-14 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Search className="size-5" /></div><h3 className="mt-4 font-heading text-xl font-bold">Nenhuma tribo encontrada</h3><p className="mt-2 text-sm text-muted-foreground">Tente outro termo ou remova alguns filtros.</p><Button variant="outline" className="mt-5 rounded-full" onClick={() => { setSelectedCategory("todos"); setSelectedFormat("Todos"); setOnlyBeginners(false); setSearchQuery(""); setSortBy("relevancia"); }}>Limpar busca e filtros</Button></div>}

        {displayedTribes.length > 0 && (
          <div className="mt-8">
            <section className="rounded-3xl border border-border bg-gradient-to-br from-background via-card to-muted/40 px-4 py-7 shadow-[0_10px_30px_rgba(65,35,30,0.045)] sm:px-6 sm:py-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Comunidades</p>
                <h3 className="mt-1 font-heading text-2xl font-extrabold text-foreground">{compact ? "Algumas comunidades" : "Comunidades em destaque"}</h3>
                
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {displayedTribes.map((tribe, index) => {
                  const accents = ["#bd463e", "#d28a62", "#9d5a50", "#c77b70", "#a94b43"];
                  const accent = accents[index % accents.length];
                  const spotsLeft = tribe.nextEvent.maxSpots - tribe.nextEvent.confirmedCount;
                  return (
                    <article key={"identity-" + tribe.id} className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-border bg-card shadow-[0_6px_20px_rgba(65,35,30,0.055)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/35 hover:shadow-[0_18px_38px_rgba(125,45,38,0.13)]">
                      <div className="relative flex h-[4.75rem] items-end overflow-hidden bg-gradient-to-br from-[#f8e4df] via-[#fff8f5] to-[#f0d9d2] px-5 pb-2.5 transition-colors dark:from-[#3b292a] dark:via-[#35282b] dark:to-[#342527]">
                        <div aria-hidden="true" className="absolute -right-5 -top-12 size-32 rounded-full border-[18px] border-white/55 transition-transform duration-500 group-hover:scale-110 dark:border-white/10" />
                        <div aria-hidden="true" className="absolute right-14 -top-8 size-20 rounded-full bg-white/45 blur-[1px] dark:bg-white/10" />
                        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/35 to-transparent dark:from-black/10" />
                        <span aria-hidden="true" className="absolute right-5 bottom-0 translate-y-1/3 font-heading text-7xl font-black leading-none text-white/45 transition-transform duration-500 group-hover:-translate-y-1/4">{tribe.name.slice(0, 1)}</span>
                        <span className="relative z-10 flex size-11 items-center justify-center rounded-2xl border border-white/80 bg-card/90 font-heading text-xl font-extrabold text-primary shadow-[0_5px_15px_rgba(110,45,35,0.10)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 dark:border-border">{tribe.name.slice(0, 1)}</span>
                        <span className="absolute bottom-0 left-0 h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent}, #e9a18f 58%, #f4d4c9)` }} />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-center justify-between gap-2"><Badge variant="secondary">{tribe.categoryLabel}</Badge><div className="flex items-center gap-2"><span className="text-[11px] font-semibold text-muted-foreground">{tribe.format}</span><TribeFavoriteButton tribeId={tribe.id} compact /></div></div>
                        <h4 className="mt-4 font-heading text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">{tribe.name}</h4>
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{tribe.tagline}</p>
                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-primary" />{tribe.neighborhood}</span>
                          <span className="inline-flex items-center gap-1"><Users className="size-3.5 text-primary" />{tribe.membersCount} membros</span>
                        </div>
                        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.045] p-3">
                          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-primary"><span className="inline-flex items-center gap-1"><Calendar className="size-3.5" />{tribe.nextEvent.dateLabel}</span><span>{spotsLeft} vagas</span></div>
                          <p className="mt-1 text-sm font-semibold text-foreground">{tribe.nextEvent.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{tribe.nextEvent.locationLabel}</p>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className="text-xs text-muted-foreground">{tribe.beginnerFriendly ? "✓ Iniciantes bem-vindos" : tribe.weeklyFrequency}</span><Button size="sm" variant="outline" className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap" onClick={() => handleOpenTribe(tribe)}>Ver detalhes <ArrowRight className="size-3.5" /></Button></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            
          </div>
        )}

        {!compact && <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Categorias mapeadas na validação inicial:</span>
          {INTEREST_CATEGORIES.map((cat) => (
            <span
              key={cat.id}
              className="rounded-full border border-border bg-card px-2.5 py-1 font-medium text-foreground/80"
            >
              {cat.shortLabel}
            </span>
          ))}
        </div>}
      </div>

      {/* Modal detail of selected tribe */}
      <Dialog
        open={Boolean(activeTribe)}
        onOpenChange={(open) => {
          if (!open) setActiveTribe(null);
        }}
      >
        <DialogContent className="w-[min(92vw,900px)] max-w-none max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-3xl p-5 sm:max-w-none sm:p-7">
          {activeTribe && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{activeTribe.categoryLabel}</Badge>
                  <Badge variant="outline">{activeTribe.format}</Badge>
                  {activeTribe.beginnerFriendly && (
                    <Badge className="bg-primary/10 text-primary">
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

              <div className="mt-2 min-w-0 space-y-4">
                <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold text-primary">
                    <span className="inline-flex items-center gap-1">
                      <Pin className="size-3.5" />
                      Card de Encontro Fixado
                    </span>
                    <span className="font-mono whitespace-normal">
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
                    <p className="flex items-center gap-2 font-medium text-primary">
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
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="font-semibold text-foreground">
                          {msg.author} · <span className="font-normal text-muted-foreground">{msg.role}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{msg.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTribe(null)}
                  >
                    Continuar explorando
                  </Button>
                  <Button
                    variant="outline"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl"
                    nativeButton={false}
                    render={<Link href={`/tribos/${activeTribe.id}`} />}
                  >
                    Página da tribo <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    size="lg"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold"
                    onClick={() => {
                      const chosen = activeTribe;
                      setActiveTribe(null);
                      onSelectTribeForSignup(chosen);
                    }}
                  >
                    Participar no lançamento
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
