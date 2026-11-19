"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Download,
  RefreshCw,
  Trash2,
  Users,
  MousePointerClick,
  Compass,
  CheckCircle2,
  Flame,
} from "lucide-react";
import {
  INTEREST_CATEGORIES,
  PAIN_POINTS,
  type InterestId,
  type PainPointId,
} from "@/lib/tribes-data";
import {
  clearLocalLeads,
  fetchServerMetrics,
  getLocalLeads,
  saveLocalLead,
  trackMvpEvent,
  type LocalWaitlistLead,
  type ServerAggregateMetrics,
} from "@/lib/mvp-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MetricasMvpPage() {
  const [metrics, setMetrics] = useState<ServerAggregateMetrics | null>(null);
  const [localLeads, setLocalLeads] = useState<LocalWaitlistLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadAll = useCallback(async () => {
    const serverData = await fetchServerMetrics();
    const browserLeads = getLocalLeads();
    setMetrics(serverData);
    setLocalLeads(browserLeads);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetchServerMetrics().then((serverData) => {
      if (!active) return;
      setMetrics(serverData);
      setLocalLeads(getLocalLeads());
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const pageViews = metrics?.events.page_view ?? 0;
  const ctaClicks = metrics?.events.hero_cta_click ?? 0;
  const explorerClicks = metrics?.events.explorer_interaction ?? 0;
  const planClicks = metrics?.events.plan_select ?? 0;
  const signups = metrics?.events.waitlist_signup ?? 0;

  const conversionRate =
    pageViews > 0 ? Math.min(100, (signups / pageViews) * 100).toFixed(1) : "0.0";

  const handleSeedSampleSession = async () => {
    setSeeding(true);
    const demoLeads: Omit<LocalWaitlistLead, "id" | "createdAtIso">[] = [
      {
        name: "Mariana Costa ( Dados de Exemplo )",
        email: "mariana.exemplo@ufmg.br",
        city: "Belo Horizonte - Pampulha",
        segment: "participante",
        selectedPlan: "explorador",
        interests: ["rpg", "cultura-geek"],
        painPoint: "timidez-integracao",
        tribePreselected: "Dados & Dragões Pampulha",
      },
      {
        name: "Gabriel Rocha ( Dados de Exemplo )",
        email: "gabriel.exemplo@ufmg.br",
        city: "Belo Horizonte - Savassi",
        segment: "organizador",
        selectedPlan: "organizador-plus",
        interests: ["esportes", "programacao"],
        painPoint: "confirmacao-presenca",
      },
      {
        name: "Café & Ludoteca Savassi ( Dados de Exemplo )",
        email: "contato.exemplo@ludotecabh.com.br",
        city: "Belo Horizonte - Funcionários",
        segment: "parceiro",
        selectedPlan: "parceiro-local",
        interests: ["rpg", "leitura", "gastronomia"],
        painPoint: "encontrar-grupos-locais",
      },
    ];

    await trackMvpEvent({ event: "page_view" });
    await trackMvpEvent({ event: "hero_cta_click" });
    await trackMvpEvent({ event: "explorer_interaction", interests: ["rpg", "esportes"] });

    for (const demo of demoLeads) {
      saveLocalLead({
        ...demo,
        id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAtIso: new Date().toISOString(),
      });
      await trackMvpEvent({
        event: "waitlist_signup",
        segment: demo.segment,
        plan: demo.selectedPlan,
        interests: demo.interests,
        painPoint: demo.painPoint,
      });
    }

    await loadAll();
    setSeeding(false);
  };

  const handleExportCsv = () => {
    if (localLeads.length === 0) return;
    const headers = [
      "Data_Hora_SP",
      "Nome",
      "Email",
      "Cidade",
      "Segmento",
      "Plano_Interesse",
      "Interesses",
      "Dor_Principal",
      "Tribo_Selecionada",
    ];
    const rows = localLeads.map((l) => {
      const spTime = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(l.createdAtIso));
      return [
        spTime,
        l.name,
        l.email,
        l.city,
        l.segment,
        l.selectedPlan ?? "explorador",
        l.interests.join(" | "),
        l.painPoint ?? "",
        l.tribePreselected ?? "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tribes-mvp-leads-locais.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const interestRanking = INTEREST_CATEGORIES.map((cat) => ({
    ...cat,
    count: metrics?.interests[cat.id as InterestId] ?? 0,
  })).sort((a, b) => b.count - a.count);

  const maxInterestCount = Math.max(1, ...interestRanking.map((i) => i.count));

  const painRanking = PAIN_POINTS.map((p) => ({
    ...p,
    count: metrics?.pains[p.id as PainPointId] ?? 0,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" render={<Link href="/" />}>
              <ArrowLeft className="size-4" />
              Voltar para a Landing Page
            </Button>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flame className="size-4 fill-current" />
              </span>
              <span className="font-heading text-sm font-extrabold">
                Tribes · Painel de Validação do MVP (TP4)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={seeding}
              onClick={handleSeedSampleSession}
            >
              <BarChart3 className="size-4 text-primary" />
              {seeding ? "Simulando..." : "Popular dados de exemplo"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadAll()}>
              <RefreshCw className="size-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <Badge className="bg-primary/12 text-primary">
            Smoke Test & Funil Lean Startup
          </Badge>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-foreground sm:text-3xl">
            Métricas de Validação da Proposta de Valor e Modelo de Negócios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe em tempo real o engajamento na Landing Page, a taxa de conversão na lista de espera e a tração por segmento de cliente e categoria de interesse.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Sessões Visitantes</span>
              <Users className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-heading text-3xl font-extrabold text-foreground">
              {loading ? "—" : pageViews}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Visualizações únicas por sessão
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Interações no Protótipo</span>
              <Compass className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-heading text-3xl font-extrabold text-foreground">
              {loading ? "—" : explorerClicks + ctaClicks}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ctaClicks} cliques Hero · {explorerClicks} explorações de tribos
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Intenção em Planos</span>
              <MousePointerClick className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-heading text-3xl font-extrabold text-foreground">
              {loading ? "—" : planClicks}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pro: {metrics?.plans["organizador-plus"] ?? 0} · Parceiro B2B:{" "}
              {metrics?.plans["parceiro-local"] ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-600/30 bg-emerald-500/[0.06] p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
              <span>Cadastros & Conversão</span>
              <CheckCircle2 className="size-4 text-emerald-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-2.5">
              <p className="font-heading text-3xl font-extrabold text-foreground">
                {loading ? "—" : signups}
              </p>
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-xs font-bold text-white">
                {conversionRate}% conv.
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Meta de validação inicial: &ge; 10%
            </p>
          </div>
        </div>

        {/* Segment Breakdown + Interest Demand */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs lg:col-span-5">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Leads por Segmento de Cliente (BMC)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Validação dos três lados do modelo de negócios da Tribes
            </p>

            <div className="mt-5 space-y-4">
              {[
                {
                  label: "Membros Exploradores (B2C)",
                  count: metrics?.segments.participante ?? 0,
                  color: "bg-primary",
                },
                {
                  label: "Organizadores de Comunidades (Freemium / Pro)",
                  count: metrics?.segments.organizador ?? 0,
                  color: "bg-amber-500",
                },
                {
                  label: "Points & Espaços Parceiros (B2B Local)",
                  count: metrics?.segments.parceiro ?? 0,
                  color: "bg-emerald-600",
                },
              ].map((seg) => {
                const pct = signups > 0 ? Math.round((seg.count / signups) * 100) : 0;
                return (
                  <div key={seg.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>{seg.label}</span>
                      <span className="font-mono font-bold">
                        {seg.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${seg.color} transition-all`}
                        style={{ width: `${Math.max(pct, seg.count > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <h3 className="font-heading text-sm font-bold text-foreground">
                Dores mais relatadas no cadastro
              </h3>
              <ul className="mt-3 space-y-2 text-xs">
                {painRanking.slice(0, 4).map((pain) => (
                  <li
                    key={pain.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2"
                  >
                    <span className="line-clamp-1 text-muted-foreground">
                      {pain.label}
                    </span>
                    <span className=" shrink-0 font-mono font-bold text-foreground">
                      {pain.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs lg:col-span-7">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Demanda por Categorias de Interesse
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Soma de interações no explorador + seleções na lista de espera para priorizar as primeiras tribos
            </p>

            <div className="mt-5 space-y-3">
              {interestRanking.map((item) => {
                const widthPct =
                  item.count > 0 ? Math.round((item.count / maxInterestCount) * 100) : 0;
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="font-mono font-semibold text-muted-foreground">
                        {item.count} sinais
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Local Leads Table (Browser-local privacy safe) */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Cadastros Registrados neste Navegador
                </h2>
                <Badge variant="secondary">Armazenamento Local (LGPD)</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Por privacidade, nome e e-mail ficam salvos localmente no navegador de quem preenche, enquanto o servidor contabiliza apenas totais anônimos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={localLeads.length === 0}
                onClick={handleExportCsv}
              >
                <Download className="size-4" />
                Exportar CSV
              </Button>
              {localLeads.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearLocalLeads();
                    setLocalLeads([]);
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                  Limpar locais
                </Button>
              )}
            </div>
          </div>

          {localLeads.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum cadastro realizado neste navegador ainda. Preencha o formulário na{" "}
              <Link href="/#lista-espera" className="font-semibold text-primary underline">
                Landing Page
              </Link>{" "}
              ou clique em <strong>“Popular dados de exemplo”</strong> no topo para testar o painel e a exportação CSV.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 pr-4 font-semibold">Horário (BRT)</th>
                    <th className="py-2.5 pr-4 font-semibold">Nome</th>
                    <th className="py-2.5 pr-4 font-semibold">Cidade</th>
                    <th className="py-2.5 pr-4 font-semibold">Segmento</th>
                    <th className="py-2.5 pr-4 font-semibold">Interesses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {localLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="py-3 pr-4 font-mono text-muted-foreground">
                        {new Intl.DateTimeFormat("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(lead.createdAtIso))}
                      </td>
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {lead.name}
                        <div className="text-[11px] text-muted-foreground">{lead.email}</div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{lead.city}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="capitalize">
                          {lead.segment}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {lead.interests.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
