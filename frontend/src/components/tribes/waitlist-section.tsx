"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Users,
  CalendarPlus,
  Store,
  Shield,
} from "lucide-react";
import {
  INTEREST_CATEGORIES,
  PAIN_POINTS,
  SAMPLE_TRIBES,
  type InterestId,
  type PainPointId,
  type PlanId,
  type SegmentId,
} from "@/lib/tribes-data";
import { saveLocalLead, trackMvpEvent } from "@/lib/mvp-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface WaitlistSectionProps {
  segment: SegmentId;
  onSegmentChange: (segment: SegmentId) => void;
  selectedInterests: InterestId[];
  onToggleInterest: (interest: InterestId) => void;
  preselectedPlan?: PlanId;
  preselectedTribeName?: string;
}

const SEGMENT_OPTIONS: {
  id: SegmentId;
  title: string;
  subtitle: string;
  icon: typeof Users;
}[] = [
  {
    id: "participante",
    title: "Quero participar de tribos",
    subtitle: "Encontrar pessoas e companhia p/ hobbies",
    icon: Users,
  },
  {
    id: "organizador",
    title: "Quero criar / organizar grupos",
    subtitle: "Gerenciar encontros, vagas e recorrência",
    icon: CalendarPlus,
  },
  {
    id: "parceiro",
    title: "Tenho um espaço parceiro",
    subtitle: "Café, ludoteca, quadra, livraria ou clube",
    icon: Store,
  },
];

export function WaitlistSection({
  segment,
  onSegmentChange,
  selectedInterests,
  onToggleInterest,
  preselectedPlan,
  preselectedTribeName,
}: WaitlistSectionProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Belo Horizonte - MG");
  const [painPoint, setPainPoint] = useState<PainPointId>("encontrar-grupos-locais");
  const [consentChecked, setConsentChecked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedState, setSubmittedState] = useState<{
    queuePosition: number;
    recommendedTribes: typeof SAMPLE_TRIBES;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setErrorMessage("Informe seu nome para reservarmos seu convite.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Informe um e-mail válido para receber o acesso antecipado.");
      return;
    }
    if (selectedInterests.length === 0) {
      setErrorMessage("Selecione pelo menos 1 interesse principal.");
      return;
    }
    if (!consentChecked) {
      setErrorMessage("Confirme o consentimento de uso para validação do MVP.");
      return;
    }

    setIsSubmitting(true);

    const updatedLocal = saveLocalLead({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      email: trimmedEmail,
      city: city.trim() || "Belo Horizonte - MG",
      segment,
      selectedPlan: preselectedPlan,
      interests: selectedInterests,
      painPoint,
      tribePreselected: preselectedTribeName,
      createdAtIso: new Date().toISOString(),
    });

    const serverTotals = await trackMvpEvent({
      event: "waitlist_signup",
      segment,
      plan: preselectedPlan,
      interests: selectedInterests,
      painPoint,
    });

    const matching = SAMPLE_TRIBES.filter((t) => selectedInterests.includes(t.category));
    const recommendedTribes = (matching.length > 0 ? matching : SAMPLE_TRIBES).slice(0, 2);

    const baseCount = serverTotals?.events.waitlist_signup ?? updatedLocal.length;

    setSubmittedState({
      queuePosition: 140 + baseCount,
      recommendedTribes,
    });
    setIsSubmitting(false);
  };

  const handleCopyInvite = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <section
      id="lista-espera"
      className="relative overflow-hidden border-y border-border bg-[#edf4e8] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge className="mb-3 bg-primary/12 text-primary hover:bg-primary/15">
            Acesso Antecipado · Lote Fundador
          </Badge>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Entre nas primeiras tribos da sua cidade
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Estamos abrindo o acesso por ondas para garantir grupos ativos, acolhedores e cheios de gente com os mesmos interesses que você.
          </p>
        </div>

        <div className="mt-10 rounded-[1.75rem] border border-[#d5e1ce] bg-white p-6 shadow-[0_18px_50px_rgba(48,66,45,0.10)] backdrop-blur-xl sm:p-9">
          {submittedState ? (
            <div className="space-y-6 py-2 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#e8f1e4] text-primary">
                <CheckCircle2 className="size-8" />
              </div>

              <div>
                <Badge className="bg-[#e8f1e4] text-primary">
                  Convite #{submittedState.queuePosition} reservado
                </Badge>
                <h3 className="mt-2 font-heading text-2xl font-extrabold text-foreground">
                  Você está dentro, {name.split(" ")[0]}!
                </h3>
                <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted-foreground">
                  Registramos seu perfil como{" "}
                  <strong>
                    {segment === "participante"
                      ? "Membro Explorador"
                      : segment === "organizador"
                        ? "Organizador Fundador (3 meses Pro grátis)"
                        : "Point Parceiro Verificado"}
                  </strong>
                  {preselectedTribeName ? ` com interesse prioritário em "${preselectedTribeName}"` : ""}.
                </p>
              </div>

              <div className="mx-auto max-w-xl rounded-2xl border border-[#c8d3be] bg-white p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tribos compatíveis com o seu perfil no lançamento:
                </p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {submittedState.recommendedTribes.map((tribe) => (
                    <div
                      key={tribe.id}
                      className="rounded-xl border border-[#d5e1ce] bg-[#f4f7f1] p-3"
                    >
                      <p className="font-heading text-sm font-bold text-foreground">
                        {tribe.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tribe.nextEvent.dateLabel} · {tribe.neighborhood}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleCopyInvite}
                  className="rounded-xl font-semibold"
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-4" />
                      Link copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Convidar amigos para furar a fila
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="rounded-xl"
                  onClick={() => {
                    setSubmittedState(null);
                    setName("");
                    setEmail("");
                  }}
                >
                  Simular outro cadastro
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {(preselectedTribeName || preselectedPlan) && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/25 bg-primary/[0.05] px-4 py-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <Sparkles className="size-4 text-primary" />
                    {preselectedTribeName ? (
                      <>
                        Interesse selecionado: <strong>{preselectedTribeName}</strong>
                      </>
                    ) : (
                      <>
                        Plano selecionado:{" "}
                        <strong>
                          {preselectedPlan === "organizador-plus"
                            ? "Tribes Organizador Pro (3 meses grátis no beta)"
                            : preselectedPlan === "parceiro-local"
                              ? "Point Parceiro Verificado"
                              : "Membro Explorador Gratuito"}
                        </strong>
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Segment selector */}
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">
                  1. Como você quer usar a Tribes?
                </Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {SEGMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = segment === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSegmentChange(opt.id)}
                        className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                          active
                            ? "border-primary bg-primary/[0.05] ring-2 ring-primary/20"
                            : "border-[#d5e1ce] bg-white hover:border-primary/40 hover:bg-[#f5f9f2]"
                        }`}
                      >
                        <Icon
                          className={`size-5 ${
                            active ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span className="mt-2 font-heading text-sm font-bold text-foreground">
                          {opt.title}
                        </span>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          {opt.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name, Email, City */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-name">Seu nome *</Label>
                  <Input
                    id="lead-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Arthur Mendes"
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-email">Seu melhor e-mail *</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-city">Cidade / Bairro</Label>
                  <Input
                    id="lead-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Belo Horizonte - Pampulha"
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Interests chips */}
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">
                  2. Quais interesses você quer viver em grupo? *
                </Label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_CATEGORIES.map((cat) => {
                    const selected = selectedInterests.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => onToggleInterest(cat.id)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-[#d5e1ce] bg-white text-foreground/80 hover:border-primary/40 hover:bg-[#f5f9f2]"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main pain point validation */}
              <div className="space-y-2">
                <Label htmlFor="lead-pain" className="text-sm font-semibold">
                  3. O que mais te atrapalha hoje para participar ou organizar grupos?
                </Label>
                <select
                  id="lead-pain"
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value as PainPointId)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {PAIN_POINTS.map((pain) => (
                    <option key={pain.id} value={pain.id}>
                      {pain.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Consent */}
              <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-input accent-primary"
                />
                <span className="leading-relaxed">
                  Concordo em receber o convite de acesso antecipado da Tribes. Seus dados pessoais ficam salvos apenas no seu navegador nesta para organizar o acesso antecipado. Usaremos os dados somente para contato sobre o lançamento e validação da Tribes.
                </span>
              </label>

              {errorMessage && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
                  {errorMessage}
                </p>
              )}

              <div className="flex flex-col items-center justify-between gap-3 pt-1 sm:flex-row">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="size-4 text-primary" />
                </span>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full rounded-full px-7 font-semibold shadow-md sm:w-auto"
                >
                  {isSubmitting
                    ? "Reservando seu lugar..."
                    : segment === "organizador"
                      ? "Garantir acesso de Organizador Fundador"
                      : segment === "parceiro"
                        ? "Cadastrar interesse como Point Parceiro"
                        : "Entrar gratuitamente na lista de espera"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
