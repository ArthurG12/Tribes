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
    <header className="sticky top-0 z-40 w-full border-b border-[#dce8c8] bg-[#f8faef]/95 shadow-[0_3px_0_rgba(35,65,35,0.04)] backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 font-heading text-xl font-extrabold tracking-tight text-foreground">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#d8f58a] text-[#193c27] shadow-[3px_3px_0_#b9d96b] transition-transform group-hover:rotate-[-5deg] group-hover:scale-105">
            <TribesMark className="size-7" />
          </span>
          <span>Tribes</span>
          <span className="hidden rounded-full border border-[#dce8c8] bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#55713c] sm:inline-flex">MVP Beta</span>
        </Link>
        <nav className="hidden items-center gap-5 xl:flex">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={`relative py-2 text-[13px] font-semibold transition-colors hover:text-[#4e762d] ${pathname === item.href ? "text-[#315b35] after:absolute after:inset-x-0 after:-bottom-[2px] after:h-[3px] after:rounded-full after:bg-[#a9d45a]" : "text-[#69765f]"}`}>{item.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" className="text-[#607257] hover:text-[#315b35]" render={<Link href="/metricas" />}>
            <BarChart3 className="size-4" /> Métricas
          </Button>
          <Button size="lg" className="rounded-md bg-[#c8ed75] px-5 font-semibold text-[#193c27] shadow-[4px_4px_0_#a8cc5a] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#a8cc5a]" onClick={onCtaClick} render={<Link href="/lista-de-espera" />}>
            Garantir acesso <ArrowRight className="size-4" />
          </Button>
        </div>
        <button type="button" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((prev) => !prev)} className="inline-flex size-10 items-center justify-center rounded-xl border border-[#dce8c8] bg-white text-foreground transition-colors hover:bg-[#edf4df] md:hidden">
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t border-[#dce8c8] bg-[#f8faef] px-4 py-4 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#607257] transition-colors hover:bg-[#eaf2dc] hover:text-[#315b35]">{item.label}</Link>
            ))}
            <Link href="/metricas" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[#607257] hover:bg-[#eaf2dc] hover:text-[#315b35]">
              <BarChart3 className="size-4" /> Painel de Métricas MVP
            </Link>
            <Button size="lg" className="mt-2 w-full rounded-xl bg-[#c8ed75] font-semibold text-[#193c27]" onClick={() => setMobileOpen(false)} render={<Link href="/lista-de-espera" />}>
              Entrar na lista de espera <ArrowRight className="size-4" />
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
