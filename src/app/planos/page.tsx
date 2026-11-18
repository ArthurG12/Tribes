import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PRICING_PLANS } from "@/lib/tribes-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageIntro, PageShell } from "@/components/tribes/page-shell";

export default function PlansPage() {
  return <PageShell><PageIntro eyebrow="Planos e modelo de negócios" title="Grátis para se conectar. Poderosa para quem lidera." description="A Tribes combina acesso gratuito para participantes com recursos e parcerias para quem organiza comunidades e movimenta espaços locais." /><div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-3 sm:px-6">{PRICING_PLANS.map(plan => <article key={plan.id} className={`relative flex flex-col rounded-3xl border p-7 ${plan.highlighted ? "border-primary bg-card shadow-lg ring-2 ring-primary/15" : "border-border bg-card"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{plan.audience}</span>{plan.badge && <Badge>{plan.badge}</Badge>}</div><h2 className="mt-4 font-heading text-2xl font-extrabold text-foreground">{plan.name}</h2><div className="mt-4 flex items-baseline gap-1"><span className="font-heading text-4xl font-extrabold text-foreground">{plan.price}</span><span className="text-xs text-muted-foreground">{plan.period}</span></div><p className="mt-3 text-sm text-muted-foreground">{plan.description}</p><ul className="mt-6 flex-1 space-y-3 border-t border-border pt-5 text-sm">{plan.features.map(feature => <li key={feature} className="flex gap-2"><Check className="size-4 shrink-0 text-[#627c4d]" />{feature}</li>)}</ul><Button asChild className="mt-8 w-full rounded-xl"><Link href={`/lista-de-espera?plano=${plan.id}`}>{plan.ctaLabel}<ArrowRight className="size-4" /></Link></Button></article>)}</div></PageShell>;
}
