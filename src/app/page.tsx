"use client";

import Link from "next/link";
import { ArrowRight, Compass, Users, CalendarCheck2, Sparkles, BarChart3 } from "lucide-react";
import { Navbar } from "@/components/tribes/navbar";
import { HeroMockup } from "@/components/tribes/hero-mockup";
import { Button } from "@/components/ui/button";
import { TribeExplorer } from "@/components/tribes/tribe-explorer";
import { trackMvpEvent } from "@/lib/mvp-tracker";

const destinations = [
  { href: "/explorar", icon: Compass, title: "Explore tribos", description: "Encontre comunidades por interesse e descubra encontros." },
  { href: "/como-funciona", icon: CalendarCheck2, title: "Como funciona", description: "Veja como sair da descoberta para um encontro real." },
  { href: "/para-quem", icon: Users, title: "Para quem é", description: "Uma experiência para membros, organizadores e espaços." },
];

export default function TribesLandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden bg-[#f7faf4] py-12 sm:py-16 lg:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[34rem] w-[34rem] rounded-full bg-[#c4f36a]/12 blur-[130px]" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[-18rem] left-[-12%] -z-10 h-[34rem] w-[34rem] rounded-full bg-orange-500/10 blur-[130px]" />
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Rede social de comunidades & encontros reais
              </div>
              <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
                Menos rolagem infinita. <span className="text-primary">Mais encontros reais com a sua tribo.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Descubra grupos de pessoas com os mesmos interesses perto de você — de RPG de mesa e corrida a clubes do livro e programação — e organize encontros sem perder data, local e confirmações no meio do chat.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="h-12 rounded-full px-7 text-base font-semibold" render={<Link href="/lista-de-espera" />}>
                  Entrar na lista de espera <ArrowRight className="size-4" />
                </Button>
                <Button variant="outline" size="lg" className="h-12 rounded-full px-6 text-base font-semibold" render={<Link href="/explorar" />}>
                  Explorar tribos
                </Button>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border/80 pt-5">
                <div><p className="font-heading text-xl font-extrabold text-foreground sm:text-2xl">9 nichos</p><p className="text-xs text-muted-foreground">mapeados na validação inicial</p></div>
                <div><p className="font-heading text-xl font-extrabold text-foreground sm:text-2xl">1 clique</p><p className="text-xs text-muted-foreground">para confirmar presença</p></div>
                <div><p className="font-heading text-xl font-extrabold text-[#627c4d] sm:text-2xl">Grátis</p><p className="text-xs text-muted-foreground">para descobrir e participar</p></div>
              </div>
            </div>
            <div className="lg:col-span-6"><HeroMockup /></div>
          </div>
        </section>
        <section className="border-y border-[#dce6d5] bg-[#edf3e8] py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Conheça a Tribes</p>
              <h2 className="mt-3 font-heading text-3xl font-extrabold text-foreground sm:text-4xl">Tudo o que você precisa, em seu próprio espaço.</h2>
              <p className="mt-3 text-muted-foreground">Navegue pelas áreas da plataforma sem precisar percorrer uma página interminável.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {destinations.map(({ href, icon: Icon, title, description }) => (
                <Link key={href} href={href} className="surface-card group bg-white p-6 hover:-translate-y-1 hover:bg-[#fbfdf9]">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary"><Icon className="size-5" /></span>
                  <h3 className="mt-4 font-heading text-lg font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Acessar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" render={<Link href="/planos" />}>Ver planos</Button>
              <Button variant="outline" render={<Link href="/sobre" />}>Por que Tribes?</Button>
              <Button variant="outline" render={<Link href="/faq" />}>Perguntas frequentes</Button>
            </div>
          </div>
        </section>
        <section className="relative overflow-hidden bg-[#f7faf4] py-14 sm:py-18">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#eaf2e3] to-transparent" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-2 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Encontre sua comunidade</p>
              <h2 className="mt-3 font-heading text-3xl font-extrabold text-foreground sm:text-4xl">Explore tribos</h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Descubra grupos por interesse, conheça as comunidades e encontre seu próximo encontro.</p>
            </div>
            <TribeExplorer
              onSelectTribeForWaitlist={(tribe) => { window.location.href = "/lista-de-espera?tribo=" + encodeURIComponent(tribe.id); }}
              onExplorerInteract={(interest) => { void trackMvpEvent({ event: "explorer_interaction", interests: interest ? [interest] : undefined }); }}
            />
            <div className="mt-2 text-center">
              <Button variant="outline" className="rounded-full" render={<Link href="/explorar" />}>Ver página de exploração completa <ArrowRight className="size-4" /></Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-muted-foreground">Tribes · Conexões reais a partir de interesses em comum · Belo Horizonte, MG</p>
          <Link href="/metricas" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><BarChart3 className="size-4" /> Painel de métricas MVP</Link>
        </div>
      </footer>
    </div>
  );
}
