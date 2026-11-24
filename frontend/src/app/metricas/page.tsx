"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Compass,
  Heart,
  MessageCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { INTEREST_CATEGORIES } from "@/lib/tribes-data";
import {
  fetchProductionMetrics,
  type MetricsRange,
  type ProductionMetrics,
} from "@/lib/mvp-tracker";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type LoadState = "loading" | "ready" | "unauthenticated" | "forbidden" | "unconfigured" | "error";

const RANGE_LABELS: Record<MetricsRange, string> = {
  "24h": "Últimas 24 horas",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <section className="metric-card">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 font-heading text-3xl font-extrabold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </section>
  );
}

export default function MetricasMvpPage() {
  const [range, setRange] = useState<MetricsRange>("30d");
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchProductionMetrics(range, controller.signal)
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          setState("unauthenticated");
          setMetrics(null);
          return;
        }
        if (response.status === 403) {
          setState("forbidden");
          setMetrics(null);
          return;
        }
        if (response.status === 503) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          if (!active) return;
          setState(body?.error?.includes("não configurado") ? "unconfigured" : "error");
          setMetrics(null);
          return;
        }
        if (!response.ok) throw new Error("Falha ao carregar métricas.");
        const data = await response.json() as ProductionMetrics;
        if (!active) return;
        setMetrics(data);
        setState("ready");
      })
      .catch(() => {
        if (!active) return;
        setMetrics(null);
        setState("error");
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [range, reloadCount]);

  const refreshMetrics = () => {
    setState("loading");
    setReloadCount((value) => value + 1);
  };

  const maxInterest = Math.max(1, ...Object.values(metrics?.interests ?? {}));
  const rankedInterests = INTEREST_CATEGORIES
    .map((interest) => ({ ...interest, visitors: metrics?.interests[interest.id] ?? 0 }))
    .sort((left, right) => right.visitors - left.visitors);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" render={<Link href="/" />}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <span className="flex items-center gap-2 font-heading text-sm font-extrabold">
              <BarChart3 className="size-4 text-primary" /> Tribes · Métricas de produção
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <label className="sr-only" htmlFor="metrics-range">Período das métricas</label>
            <select
              id="metrics-range"
              value={range}
              onChange={(event) => {
                setState("loading");
                setRange(event.target.value as MetricsRange);
              }}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium"
            >
              {Object.entries(RANGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={refreshMetrics} disabled={state === "loading"}>
              <RefreshCw className={`size-4 ${state === "loading" ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Painel administrativo</p>
          <h1 className="mt-1 font-heading text-2xl font-extrabold sm:text-3xl">Uso e crescimento da Tribes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Usuários ativos são contas autenticadas com atividade real no período, não sessões apenas válidas.
          </p>
        </div>

        {state === "loading" && (
          <div role="status" className="surface-card p-8 text-center text-sm text-muted-foreground">
            Carregando métricas…
          </div>
        )}

        {state === "unauthenticated" && (
          <div className="surface-card space-y-3 p-8 text-center">
            <h2 className="font-heading text-lg font-bold">Entre para acessar o painel</h2>
            <p className="text-sm text-muted-foreground">O acesso é restrito a contas autorizadas.</p>
            <Button render={<Link href={`/entrar?next=${encodeURIComponent("/metricas")}`} />}>Entrar</Button>
          </div>
        )}

        {state === "forbidden" && (
          <div role="alert" className="surface-card p-8 text-center">
            <h2 className="font-heading text-lg font-bold">Conta sem permissão</h2>
            <p className="mt-2 text-sm text-muted-foreground">Esta conta não está autorizada a consultar as métricas.</p>
          </div>
        )}

        {state === "unconfigured" && (
          <div role="alert" className="surface-card p-8 text-center">
            <h2 className="font-heading text-lg font-bold">Acesso administrativo ainda não configurado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Configure `METRICS_ADMIN_EMAILS` no ambiente do backend.</p>
          </div>
        )}

        {state === "error" && (
          <div role="alert" className="surface-card space-y-3 p-8 text-center">
            <h2 className="font-heading text-lg font-bold">Não foi possível carregar as métricas</h2>
            <p className="text-sm text-muted-foreground">Tente novamente em instantes.</p>
            <Button variant="outline" onClick={refreshMetrics}>Tentar novamente</Button>
          </div>
        )}

        {state === "ready" && metrics && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {RANGE_LABELS[range]}</span>
              <span>Baseline confiável desde {formatDate(metrics.baselineAtIso)}</span>
            </div>

            <section aria-label="Usuários" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Contas registradas" value={metrics.users.total} detail={`+${metrics.users.newInRange} no período selecionado`} icon={Users} />
              <MetricCard label="Ativos · 24 horas" value={metrics.users.active.dau} detail="Usuários ativos diários (DAU)" icon={Activity} />
              <MetricCard label="Ativos · 7 dias" value={metrics.users.active.wau} detail="Usuários ativos semanais (WAU)" icon={Activity} />
              <MetricCard label="Ativos · 30 dias" value={metrics.users.active.mau} detail={`${metrics.users.stickinessPercent}% de stickiness DAU/MAU`} icon={Users} />
            </section>

            <section className="surface-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-lg font-bold">Aquisição e cadastro</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Visitantes únicos deduplicados por sessão anônima first-party de 24 horas.</p>
                </div>
                <CheckCircle2 className="size-5 text-primary" />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Visitantes únicos" value={metrics.funnel.uniqueVisitors} detail="Sessões iniciadas no período" icon={Users} />
                <MetricCard label="Cliques no CTA" value={metrics.funnel.heroCtaClicks} detail="Visitantes que clicaram em começar" icon={CheckCircle2} />
                <MetricCard label="Inícios de cadastro" value={metrics.funnel.registrationStarts} detail="Solicitações do link de cadastro" icon={Activity} />
                <MetricCard label="Cadastros atribuídos" value={metrics.funnel.attributedRegistrations} detail={`${metrics.funnel.conversionPercent}% dos visitantes do período`} icon={Users} />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Sessões na landing: {metrics.funnel.landingViews} · Explorar: {metrics.funnel.explorerPageViews} · Visitas ao cadastro: {metrics.funnel.registrationPageViews} · Sessões com interação no explorador: {metrics.funnel.explorerSessions}
              </p>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="surface-card p-6">
                <h2 className="font-heading text-lg font-bold">Atividade do produto</h2>
                <p className="mt-1 text-xs text-muted-foreground">Registros ainda existentes, criados no período selecionado; dados excluídos deixam de compor esses totais.</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <ActivityValue label="Novas tribos" value={metrics.activity.tribes_created} icon={Compass} />
                  <ActivityValue label="Entradas em tribos" value={metrics.activity.memberships_joined} icon={Users} />
                  <ActivityValue label="Publicações" value={metrics.activity.posts_created} icon={MessageCircle} />
                  <ActivityValue label="Eventos criados" value={metrics.activity.events_created} icon={CalendarDays} />
                  <ActivityValue label="Comentários existentes" value={metrics.activity.comments_created} icon={MessageCircle} />
                  <ActivityValue label="Curtidas ativas" value={metrics.activity.likes_created} icon={Heart} />
                  <ActivityValue label="Presenças confirmadas" value={metrics.activity.event_attendances} icon={CheckCircle2} />
                </div>
              </section>

              <section className="surface-card p-6">
                <h2 className="font-heading text-lg font-bold">Interesses explorados</h2>
                <p className="mt-1 text-xs text-muted-foreground">Visitantes distintos por categoria; cada sessão conta uma vez por interesse.</p>
                <div className="mt-5 space-y-3">
                  {rankedInterests.map((interest) => (
                    <div key={interest.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium">{interest.label}</span>
                        <span className="font-mono text-muted-foreground">{interest.visitors}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(interest.visitors / maxInterest * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ActivityValue({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-3">
      <span className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4 text-primary" />{label}</span>
      <strong className="font-mono text-foreground">{value}</strong>
    </div>
  );
}
