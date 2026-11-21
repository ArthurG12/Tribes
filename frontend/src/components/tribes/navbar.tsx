"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/explorar", label: "Explorar tribos" },
  { href: "/planos", label: "Planos" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Tribes — página inicial" className="flex shrink-0 items-center gap-2.5">
          <span className="relative h-12 w-[7.25rem] overflow-hidden">
            <Image src="/tribes-logo.png" alt="Tribes — Comunidade e Natureza" fill priority sizes="116px" className="scale-[1.22] object-cover object-center" />
          </span>
        </Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}
              className={`relative py-2 text-[13px] font-semibold transition-colors hover:text-foreground ${pathname === item.href ? "text-primary after:absolute after:inset-x-0 after:-bottom-[2px] after:h-[3px] after:rounded-full after:bg-primary" : "text-muted-foreground"}`}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Button size="lg" className="rounded-full px-4 font-semibold" nativeButton={false} render={<Link href="/lista-de-espera" />}>
            Começar <ArrowRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/entrar" />}>
            <LogIn className="size-4" /> Entrar
          </Button>
        </div>
        <button type="button" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground lg:hidden">
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={pathname === item.href ? "page" : undefined} className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${pathname === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{item.label}</Link>
            ))}
            <Link href="/entrar" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted">
              <LogIn className="size-4" /> Entrar
            </Link>
            <Button size="lg" className="mt-2 w-full rounded-full font-semibold" nativeButton={false} onClick={() => setMobileOpen(false)} render={<Link href="/lista-de-espera" />}>
              Entrar na lista de espera <ArrowRight className="size-4" />
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
