"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BarChart3, ArrowRight } from "lucide-react";
import { TribesMark } from "@/components/tribes/tribes-mark";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onCtaClick?: () => void;
}

const NAV_LINKS = [
  { href: "/explorar", label: "Explorar tribos" },
  { href: "/minha-agenda", label: "Minha agenda" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/sobre", label: "Por que Tribes" },
  { href: "/para-quem", label: "Para quem" },
  { href: "/planos", label: "Planos" },
  { href: "/faq", label: "Dúvidas" },
];

export function Navbar({ onCtaClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#c8d3be] bg-[#eaf2e3]/95 shadow-[0_3px_0_rgba(35,65,35,0.04)] backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 font-heading text-xl font-extrabold tracking-tight text-foreground">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#c3dc9a] text-[#344b39] shadow-[3px_3px_0_#9dbd70] transition-transform group-hover:rotate-[-5deg] group-hover:scale-105">
            <TribesMark className="size-7" />
          </span>
          <span>Tribes</span>
          <span className="hidden rounded-full border border-[#c8d3be] bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#5c704b] sm:inline-flex">MVP Beta</span>
        </Link>
        <nav className="hidden items-center gap-5 xl:flex">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={`relative py-2 text-[13px] font-semibold transition-colors hover:text-[#586f43] ${pathname === item.href ? "text-[#3f6045] after:absolute after:inset-x-0 after:-bottom-[2px] after:h-[3px] after:rounded-full after:bg-[#a6d66a]" : "text-[#66715f]"}`}>{item.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" className="text-[#657260] hover:text-[#3f6045]" nativeButton={false} render={<Link href="/metricas" />}>
            <BarChart3 className="size-4" /> Métricas
          </Button>
          <Button size="lg" className="rounded-md bg-[#b7d58b] px-5 font-semibold text-[#344b39] shadow-[4px_4px_0_#9dbb75] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#91a96a]" onClick={onCtaClick} nativeButton={false} render={<Link href="/lista-de-espera" />}>
            Garantir acesso <ArrowRight className="size-4" />
          </Button>
        </div>
        <button type="button" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((prev) => !prev)} className="inline-flex size-10 items-center justify-center rounded-xl border border-[#c8d3be] bg-white text-foreground transition-colors hover:bg-[#e0ecd7] md:hidden">
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t border-[#c8d3be] bg-[#e3e9dc] px-4 py-4 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#657260] transition-colors hover:bg-[#e0ecd7] hover:text-[#3f6045]">{item.label}</Link>
            ))}
            <Link href="/metricas" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[#657260] hover:bg-[#dce5d3] hover:text-[#3f6045]">
              <BarChart3 className="size-4" /> Painel de Métricas MVP
            </Link>
            <Button size="lg" className="mt-2 w-full rounded-xl bg-[#a9c47c] font-semibold text-[#344b39]" onClick={() => setMobileOpen(false)} nativeButton={false} render={<Link href="/lista-de-espera" />}>
              Entrar na lista de espera <ArrowRight className="size-4" />
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
