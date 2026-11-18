"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  CalendarCheck2,
  HeartHandshake,
  Check,
  X,
  Users,
  Sparkles,
  Store,
  Flame,
  BarChart3,
  MessageCircleOff,
  MapPin,
} from "lucide-react";
import {
  COMPARISON_ROWS,
  FAQ_ITEMS,
  PRICING_PLANS,
  type InterestId,
  type PlanId,
  type SegmentId,
  type TribePreview,
} from "@/lib/tribes-data";
import { trackMvpEvent } from "@/lib/mvp-tracker";
import { Navbar } from "@/components/tribes/navbar";
import { HeroMockup } from "@/components/tribes/hero-mockup";
import { TribeExplorer } from "@/components/tribes/tribe-explorer";
import { WaitlistSection } from "@/components/tribes/waitlist-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function TribesLandingPage() {
  const [selectedSegment, setSelectedSegment] = useState<SegmentId>("participante");
  const [selectedPlan, setSelectedPlan] = useState<PlanId | undefined>(undefined);
  const [selectedInterests, setSelectedInterests] = useState<InterestId[]>([
    "esportes",
    "rpg",
  ]);
  const [selectedTribeName, setSelectedTribeName] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    void trackMvpEvent({ event: "page_view" });
  }, []);

  const scrollToWaitlist = () => {
    const el = document.getElementById("lista-espera");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const handleHeroCta = () => {
    void trackMvpEvent({ event: "hero_cta_click" });
  };

  const handleSelectTribeForWaitlist = (tribe: TribePreview) => {
    setSelectedSegment("participante");
    setSelectedInterests((prev) =>
      prev.includes(tribe.category) ? prev : [tribe.category, ...prev]
    );
    setSelectedTribeName(tribe.name);
    void trackMvpEvent({
      event: "explorer_interaction",
      interests: [tribe.category],
    });
    setTimeout(scrollToWaitlist, 80);
  };

  const handleToggleInterest = (interest: InterestId) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const handleSelectPlan = (planId: PlanId, segmentDefault: SegmentId) => {
    setSelectedPlan(planId);
    setSelectedSegment(segmentDefault);
    void trackMvpEvent({
      event: "plan_select",
      plan: planId,
      segment: segmentDefault,
    });
    scrollToWaitlist();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onCtaClick={handleHeroCta} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative isolate overflow-hidden py-20 sm:py-28 lg:py-32">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[34rem] w-[34rem] rounded-full bg-violet-600/20 blur-[130px]" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[-18rem] left-[-12%] -z-10 h-[34rem] w-[34rem] rounded-full bg-fuchsia-600/10 blur-[130px]" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                Rede social de comunidades & encontros reais
              </div>

              <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
                Menos rolagem infinita.{" "}
                <span className="text-primary">
                  Mais encontros reais com a sua tribo.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Descubra grupos de pessoas com os mesmos interesses perto de você — de RPG de mesa e corrida a clubes do livro e programação — e organize encontros sem perder data, local e confirmações no meio do chat.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-12 rounded-full px-7 text-base font-semibold shadow-md"
                  onClick={handleHeroCta}
                  render={<a href="#lista-espera" />}
                >
                  Entrar na lista de espera
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full px-6 text-base font-semibold"
                  onClick={() => {
                    void trackMvpEvent({ event: "explorer_interaction" });
                  }}
                  render={<a href="#explorar" />}
                >
                  Explorar tribos de exemplo
                </Button>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border/80 pt-6">
                <div>
                  <p className="font-heading text-xl font-extrabold text-foreground sm:text-2xl">
                    9 nichos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    mapeados na validação inicial
                  </p>
                </div>
                <div>
                  <p className="font-heading text-xl font-extrabold text-foreground sm:text-2xl">
                    1 clique
                  </p>
                  <p className="text-xs text-muted-foreground">
                    para confirmar presença (RSVP)
                  </p>
                </div>
                <div>
                  <p className="font-heading text-xl font-extrabold text-cyan-300 sm:text-2xl">
                    100% grátis
                  </p>
                  <p className="text-xs text-muted-foreground">
                    para descobrir e participar
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <HeroMockup
                onInteract={() => {
                  void trackMvpEvent({ event: "explorer_interaction" });
                }}
              />
            </div>
          </div>
        </section>

        {/* PROBLEMA VS SOLUCAO */}
        <section
          id="problema"
          className="border-y border-border bg-white/[0.025] py-24 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge
                variant="outline"
                className="mb-3 border-foreground/15 bg-background px-3 py-1 text-xs font-semibold"
              >
                O problema que identificamos
              </Badge>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Nunca tivemos tantas redes sociais — e nunca foi tão difícil combinar algo de verdade
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Redes tradicionais prendem você num feed passivo, enquanto apps de mensagens transformam qualquer tentativa de organizar um grupo em ruído.
              </p>
            </div>

            {/* 3 Pain cards */}
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xs">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <MapPin className="size-5" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                  “Não sei onde achar minha galera”
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Grupos de WhatsApp e Discord dependem de convite fechado. Quem chega numa cidade, faculdade ou hobby novo acaba fazendo tudo só ou desistindo.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xs">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200">
                  <MessageCircleOff className="size-5" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                  “Tudo se perde no meio do grupo”
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Data, horário, endereço e lista de presença somem em centenas de mensagens paralelas — misturadas com trabalho e família no mesmo aplicativo.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xs">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Users className="size-5" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                  “Vergonha de entrar onde ninguém me conhece”
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Entrar num grupo antigo com 200 desconhecidos intimida. Sem acolhimento para iniciantes e encontros recorrentes, a comunidade esfria e para.
                </p>
              </div>
            </div>

            {/* Comparison Matrix */}
            <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-xs">
              <div className="grid grid-cols-1 border-b border-border bg-muted/50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid-cols-12">
                <div className="md:col-span-4">O que você precisa</div>
                <div className="hidden md:col-span-4 md:block">
                  WhatsApp, Discord & Redes Atuais
                </div>
                <div className="hidden text-primary md:col-span-4 md:block">
                  Como é na Tribes
                </div>
              </div>

              <div className="divide-y divide-border">
                {COMPARISON_ROWS.map((row) => (
                  <div
                    key={row.criteria}
                    className="grid grid-cols-1 gap-3 px-6 py-4 text-sm md:grid-cols-12 md:items-center md:gap-4"
                  >
                    <div className="font-heading font-bold text-foreground md:col-span-4">
                      {row.criteria}
                    </div>
                    <div className="flex items-start gap-2 text-muted-foreground md:col-span-4">
                      <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span>{row.currentTools}</span>
                    </div>
                    <div className="flex items-start gap-2 font-medium text-foreground md:col-span-4">
                      <Check className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                      <span>{row.tribes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge className="mb-3 bg-emerald-500/12 text-cyan-200 hover:bg-emerald-500/15">
                Simples do convite ao encontro
              </Badge>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Como a Tribes transforma interesses em comunidade real
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xs">
                <span className="font-mono text-xs font-bold text-primary">
                  PASSO 01
                </span>
                <div className="mt-3 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Compass className="size-6" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold text-foreground">
                  Escolha seus hobbies e sua zona
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Marque o que você curte fazer no tempo livre e veja tribos ativas no seu bairro, campus ou online — com filtro especial para grupos abertos a iniciantes.
                </p>
              </div>

              <div className="relative rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xs">
                <span className="font-mono text-xs font-bold text-primary">
                  PASSO 02
                </span>
                <div className="mt-3 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <CalendarCheck2 className="size-6" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold text-foreground">
                  Confirme presença sem bagunça
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Cada tribo tem seu card fixo de próximo encontro com data, local, custo, limite de vagas e lista automática de confirmação separada do bate-papo.
                </p>
              </div>

              <div className="relative rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-xs">
                <span className="font-mono text-xs font-bold text-primary">
                  PASSO 03
                </span>
                <div className="mt-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-cyan-300">
                  <HeartHandshake className="size-6" />
                </div>
                <h3 className="mt-4 font-heading text-xl font-bold text-foreground">
                  Apareça, conecte-se e repita
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Encontros em escala humana, recepção guiada nos primeiros 15 minutos para quebrar o gelo e ritmo recorrente para o grupo continuar vivo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE TRIBE EXPLORER */}
        <div className="border-t border-border bg-secondary/25">
          <TribeExplorer
            onSelectTribeForWaitlist={handleSelectTribeForWaitlist}
            onExplorerInteract={(interest) => {
              void trackMvpEvent({
                event: "explorer_interaction",
                interests: interest ? [interest] : undefined,
              });
            }}
          />
        </div>

        {/* SEGMENTOS DE CLIENTES (PROPOSTA DE VALOR MULTI-LADOS DO TP3) */}
        <section id="segmentos" className="border-t border-border py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-3 px-3 py-1 text-xs font-semibold">
                Ecossistema Tribes
              </Badge>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Pensada para quem participa, para quem organiza e para quem recebe
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Conectamos membros, líderes de comunidades e espaços locais em uma experiência sustentável.
              </p>
            </div>

            <div className="mt-10">
              <Tabs defaultValue="participantes" className="w-full">
                <div className="flex justify-center">
                  <TabsList className="h-auto flex-wrap gap-1 rounded-2xl p-1.5">
                    <TabsTrigger value="participantes" className="rounded-xl px-4 py-2 text-sm">
                      Para Membros
                    </TabsTrigger>
                    <TabsTrigger value="organizadores" className="rounded-xl px-4 py-2 text-sm">
                      Para Organizadores
                    </TabsTrigger>
                    <TabsTrigger value="parceiros" className="rounded-xl px-4 py-2 text-sm">
                      Para Espaços Parceiros
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="participantes" className="mt-6">
                  <div className="grid items-center gap-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-10 md:grid-cols-2">
                    <div>
                      <Badge className="bg-primary/12 text-primary">
                        Conexão sem pressão
                      </Badge>
                      <h3 className="mt-3 font-heading text-2xl font-extrabold text-foreground">
                        Nunca mais deixe de fazer um hobby por falta de companhia
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Seja para correr 5km no domingo, fechar uma mesa de RPG no sábado ou debater um livro num café, você encontra grupos ativos no seu ritmo e sem precisar já conhecer alguém lá dentro.
                      </p>
                      <ul className="mt-5 space-y-2.5 text-sm">
                        <li className="flex items-center gap-2.5">
                          <Check className="size-4 text-cyan-300" />
                          Selo “Aberto para iniciantes” em tribos receptivas
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="size-4 text-cyan-300" />
                          Ambiente separado de mensagens de trabalho e faculdade
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="size-4 text-cyan-300" />
                          Agenda clara: saiba exatamente quem vai, quanto custa e onde será
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/45 p-6">
                      <p className="font-mono text-xs font-semibold uppercase text-primary">
                        Cenário real validado
                      </p>
                      <blockquote className="mt-3 text-sm italic leading-relaxed text-foreground/90">
                        “Queria muito jogar vôlei ou RPG presencialmente perto da faculdade, mas meus amigos não animavam os mesmos horários e os grupos que tentei no WhatsApp já eram fechados ou parados.”
                      </blockquote>
                      <p className="mt-3 text-xs font-semibold text-muted-foreground">
                        — Perfil Universitário / Jovem Profissional (18–31 anos)
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="organizadores" className="mt-6">
                  <div className="grid items-center gap-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-10 md:grid-cols-2">
                    <div>
                      <Badge className="bg-primary/12 text-primary">
                        Gestão de comunidades
                      </Badge>
                      <h3 className="mt-3 font-heading text-2xl font-extrabold text-foreground">
                        Chega de cobrar confirmação um por um na sexta à noite
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Reúna pessoas alinhadas, defina data e local por enquete rápida e deixe a lista de espera preencher automaticamente qualquer desistência de última hora.
                      </p>
                      <ul className="mt-5 space-y-2.5 text-sm">
                        <li className="flex items-center gap-2.5">
                          <Check className="size-4 text-cyan-300" />
                          RSVP com limite de vagas, fila de espera e lembrete automático
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="size-4 text-cyan-300" />
                          Encontros recorrentes (semanais ou quinzenais) em 30 segundos
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Check className="size-4 text-cyan-300" />
                          Divisão transparente de aluguel de quadra, mesa ou materiais
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/45 p-6">
                      <p className="font-mono text-xs font-semibold uppercase text-primary">
                        Menos atrito operacional
                      </p>
                      <div className="mt-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between rounded-xl bg-card p-3">
                          <span className="font-semibold">Enquete de horário</span>
                          <span className="text-cyan-300 font-semibold">Sábado 14h30 venceu (82%)</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-card p-3">
                          <span className="font-semibold">Vagas do encontro</span>
                          <span className="font-mono font-semibold">18/18 + 3 na fila automática</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-card p-3">
                          <span className="font-semibold">Taxa de presença real</span>
                          <span className="text-primary font-semibold">91% com check-in ativo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="parceiros" className="mt-6">
                  <div className="grid items-center gap-8 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-10 md:grid-cols-2">
                    <div>
                      <Badge className="bg-emerald-500/15 text-cyan-200">
                        Parceiros Locais B2B
                      </Badge>
                      <h3 className="mt-3 font-heading text-2xl font-extrabold text-foreground">
                        Transforme seu espaço no ponto oficial das tribos da cidade
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Cafés, ludotecas, livrarias, quadras esportivas e espaços culturais conectam-se diretamente com organizadores que buscam um lugar seguro e acolhedor para reunir grupos toda semana.
                      </p>
                      <ul className="mt-5 space-y-2.5 text-sm">
                        <li className="flex items-center gap-2.5">
                          <Store className="size-4 text-cyan-300" />
                          Ocupação previsível em horários estratégicos com grupos confirmados
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Store className="size-4 text-cyan-300" />
                          Selo “Point Verificado” na escolha de local pelos organizadores
                        </li>
                        <li className="flex items-center gap-2.5">
                          <Store className="size-4 text-cyan-300" />
                          Benefícios exclusivos para fidelizar comunidades inteiras
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/45 p-6">
                      <p className="font-mono text-xs font-semibold uppercase text-cyan-200">
                        Exemplos de Points Parceiros
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs font-medium">
                        <div className="rounded-xl bg-card p-3">Ludotecas & Lojas Geek</div>
                        <div className="rounded-xl bg-card p-3">Cafés Especiais & Padarias</div>
                        <div className="rounded-xl bg-card p-3">Quadras & Arenas Beach</div>
                        <div className="rounded-xl bg-card p-3">Livrarias & Coworkings</div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* PLANOS / MODELO DE NEGOCIOS */}
        <section id="planos" className="border-t border-border bg-transparent py-24 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge className="mb-3 bg-primary/12 text-primary hover:bg-primary/15">
                Modelo Freemium & Parcerias Locais
              </Badge>
              <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Grátis para se conectar. Poderosa para quem lidera comunidades.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Escolha o perfil que melhor combina com você e garanta vantagens de membro fundador no lançamento.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between rounded-3xl border p-6 sm:p-7 ${
                    plan.highlighted
                      ? "border-primary bg-card shadow-lg ring-2 ring-primary/15"
                      : "border-border bg-card shadow-xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {plan.audience}
                      </span>
                      {plan.badge && (
                        <Badge
                          className={
                            plan.highlighted
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }
                        >
                          {plan.badge}
                        </Badge>
                      )}
                    </div>

                    <h3 className="mt-3 font-heading text-xl font-extrabold text-foreground">
                      {plan.name}
                    </h3>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-heading text-4xl font-extrabold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {plan.description}
                    </p>

                    <ul className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5">
                          <Check className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                          <span className="text-foreground/90">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    size="lg"
                    variant={plan.highlighted ? "default" : "outline"}
                    className="mt-8 w-full rounded-xl font-semibold"
                    onClick={() => handleSelectPlan(plan.id, plan.segmentDefault)}
                  >
                    {plan.ctaLabel}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WAITLIST CAPTURE */}
        <WaitlistSection
          segment={selectedSegment}
          onSegmentChange={setSelectedSegment}
          selectedInterests={selectedInterests}
          onToggleInterest={handleToggleInterest}
          preselectedPlan={selectedPlan}
          preselectedTribeName={selectedTribeName}
        />

        {/* FAQ */}
        <section id="faq" className="py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Perguntas frequentes
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Tudo o que você precisa saber sobre o funcionamento e o lançamento do MVP da Tribes.
              </p>
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-2 shadow-xs">
              <Accordion className="w-full">
                {FAQ_ITEMS.map((item, idx) => (
                  <AccordionItem key={item.question} value={`faq-${idx}`}>
                    <AccordionTrigger className="py-4 font-heading text-base font-bold text-foreground hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Flame className="size-4 fill-current" />
            </span>
            <div>
              <span className="font-heading text-base font-extrabold text-foreground">
                tribes
              </span>
              <p className="text-xs text-muted-foreground">
                Conexões reais a partir de interesses em comum · Belo Horizonte, MG
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <a href="#explorar" className="hover:text-foreground">
              Explorar tribos
            </a>
            <a href="#planos" className="hover:text-foreground">
              Planos
            </a>
            <a href="#lista-espera" className="hover:text-foreground">
              Lista de espera
            </a>
            <Link
              href="/metricas"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 font-medium text-foreground hover:bg-secondary"
            >
              <BarChart3 className="size-3.5 text-primary" />
              Painel de Validação MVP (TP4)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
