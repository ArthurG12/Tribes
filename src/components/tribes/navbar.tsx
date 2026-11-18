"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, Menu, X, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onCtaClick?: () => void;
}

const NAV_LINKS = [
  { href: "/explorar", label: "Explorar tribos" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/sobre", label: "Por que Tribes" },
  { href: "/para-quem", label: "Para quem" },
  { href: "/planos", label: "Planos" },
  { href: "/faq", label: "Dúvidas" },
];

export function Navbar({ onCtaClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#10170f] border-b border-[#b7e65c]/25 shadow-none">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 font-heading text-xl font-extrabold tracking-tight text-foreground">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[#c4f36a] text-[#172013] shadow-[4px_4px_0_rgba(196,243,106,0.18)] transition-transform group-hover:rotate-[-8deg]">
            <Flame className="size-5 fill-current" />
          </span>
          <span>tribes<span className="text-primary">.</span></span>
          <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary sm:inline-flex">MVP Beta</span>
        </Link>
        <nav className="hidden items-center gap-5 xl:flex">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary">{item.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white" render={<Link href="/metricas" />}>
            <BarChart3 className="size-4" /> Métricas
          </Button>
          <Button size="lg" className="rounded-md bg-[#c4f36a] px-5 font-semibold text-white shadow-[4px_4px_0_rgba(196,243,106,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(196,243,106,0.22)]" onClick={onCtaClick} render={<Link href="/lista-de-espera" />}>
            Garantir acesso <ArrowRight className="size-4" />
          </Button>
        </div>
        <button type="button" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((prev) => !prev)} className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-foreground transition-colors hover:bg-white/[0.08] md:hidden">
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-[#0b0a12]/95 px-4 py-4 backdrop-blur-2xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white">{item.label}</Link>
            ))}
            <Link href="/metricas" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/[0.05] hover:text-white">
              <BarChart3 className="size-4" /> Painel de Métricas MVP
            </Link>
            <Button size="lg" className="mt-2 w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 font-semibold text-white" onClick={() => setMobileOpen(false)} render={<Link href="/lista-de-espera" />}>
              Entrar na lista de espera <ArrowRight className="size-4" />
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
