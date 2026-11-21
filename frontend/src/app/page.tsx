"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Navbar } from "@/components/tribes/navbar";
import { HeroMockup } from "@/components/tribes/hero-mockup";
import { Button } from "@/components/ui/button";
import { TribeExplorer } from "@/components/tribes/tribe-explorer";
import { trackMvpEvent } from "@/lib/mvp-tracker";
import { SiteFooter } from "@/components/tribes/site-footer";

export default function TribesLandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="relative isolate overflow-hidden bg-[#faf9f7] py-12 sm:py-16 lg:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[34rem] w-[34rem] rounded-full bg-primary/[0.06] blur-[130px]" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[-18rem] left-[-12%] -z-10 h-[34rem] w-[34rem] rounded-full bg-[#d69b55]/[0.06] blur-[130px]" />
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Comunidades. Interesses. Encontros.
              </div>
              <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
                Encontre sua <span className="text-primary">tribo.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Pessoas com os mesmos interesses, atividades que você gosta e encontros de verdade.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="h-12 rounded-full px-7 text-base font-semibold" render={<Link href="/lista-de-espera" />}>
                  Começar agora <ArrowRight className="size-4" />
                </Button>
                <Button variant="outline" size="lg" className="h-12 rounded-full px-6 text-base font-semibold" render={<Link href="/explorar" />}>
                  Explorar tribos
                </Button>
              </div>

            </div>
            <div className="lg:col-span-6"><HeroMockup /></div>
          </div>
        </section>
        <section className="relative overflow-hidden bg-[#faf9f7] py-12 sm:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f7efed] to-transparent" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <TribeExplorer
              compact
              onSelectTribeForWaitlist={(tribe) => { window.location.href = "/lista-de-espera?tribo=" + encodeURIComponent(tribe.id); }}
              onExplorerInteract={(interest) => { void trackMvpEvent({ event: "explorer_interaction", interests: interest ? [interest] : undefined }); }}
            />
            <div className="mt-2 text-center">
              <Button variant="outline" className="rounded-full" render={<Link href="/explorar" />}>Ver todas as tribos <ArrowRight className="size-4" /></Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
