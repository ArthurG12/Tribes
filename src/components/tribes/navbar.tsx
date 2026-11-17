"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, Menu, X, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onCtaClick?: () => void;
}

const NAV_LINKS = [
  { href: "#problema", label: "Por que Tribes" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#explorar", label: "Explorar tribos" },
  { href: "#segmentos", label: "Para quem" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "Dúvidas" },
];

export function Navbar({ onCtaClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-heading text-lg font-extrabold tracking-tight text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Flame className="size-5 fill-current" />
          </span>
          <span>tribes</span>
          <span className="hidden rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary sm:inline-block">
            MVP Beta
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            render={<Link href="/metricas" />}
          >
            <BarChart3 className="size-4" />
            Métricas MVP
          </Button>
          <Button
            size="lg"
            className="rounded-full px-4 font-semibold shadow-sm"
            onClick={onCtaClick}
            render={<a href="#lista-espera" />}
          >
            Garantir acesso
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/metricas"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <BarChart3 className="size-4" />
              Painel de Métricas MVP
            </Link>
            <Button
              size="lg"
              className="mt-1 w-full rounded-full font-semibold"
              onClick={() => {
                setMobileOpen(false);
                onCtaClick?.();
              }}
              render={<a href="#lista-espera" />}
            >
              Entrar na lista de espera
              <ArrowRight className="size-4" />
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
