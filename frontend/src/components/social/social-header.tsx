"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarDays, Compass, Flame, LogOut, Menu, Moon, Sun, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/components/social/auth-guard";
import { UserAvatar } from "@/components/social/user-avatar";

export function SocialHeader({
  user,
  darkMode,
  onToggleTheme,
}: {
  user: CurrentUser;
  darkMode: boolean;
  onToggleTheme: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    let active = true;
    const loadUnread = () => fetch("/api/notifications", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ unreadCount: number }> : null)
      .then((data) => { if (active && data) setUnreadCount(data.unreadCount); })
      .catch(() => undefined);
    void loadUnread();
    const handleUpdated = () => void loadUnread();
    window.addEventListener("tribes-notifications-updated", handleUpdated);
    const interval = window.setInterval(() => void loadUnread(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("tribes-notifications-updated", handleUpdated);
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  const nav = [
    { href: "/feed", label: "Feed", icon: Flame },
    { href: "/tribos", label: "Explorar tribos", icon: Compass },
    { href: "/minhas-tribos", label: "Minhas tribos", icon: Users },
    { href: "/eventos", label: "Eventos", icon: CalendarDays },
  ];

  const isActive = (href: string) => pathname === href || (href === "/minhas-tribos" && pathname.startsWith("/minhas-tribos/"));

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <Link href="/feed" className="flex shrink-0 items-center gap-2 font-heading text-lg font-extrabold">
          <span className="relative h-10 w-24 shrink-0 overflow-hidden sm:h-11 sm:w-[6.5rem] lg:h-12 lg:w-[7.25rem]">
            <Image src="/tribes-logo.png" alt="Tribes" fill sizes="116px" className="object-contain" />
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex xl:gap-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors xl:px-3 ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="size-4 shrink-0" /><span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Link href="/notificacoes" aria-label={unreadCount ? `Notificações, ${unreadCount} não lidas` : "Notificações"} className="relative inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Bell className="size-4" />
            {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
          <Link href="/perfil" aria-label="Meu perfil" className="flex min-w-0 items-center gap-2 rounded-xl p-1 transition-colors hover:bg-muted">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-8 text-xs" />
            <span className="hidden max-w-32 truncate text-xs font-medium text-muted-foreground xl:inline">{user.name}</span>
          </Link>
          <Button variant="ghost" size="icon-sm" aria-label={darkMode ? "Modo escuro ativo. Ativar modo claro" : "Modo claro ativo. Ativar modo escuro"} aria-pressed={darkMode} title={darkMode ? "Modo escuro" : "Modo claro"} onClick={onToggleTheme}>
            {darkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Sair da conta" onClick={() => void logout()} className="hidden sm:inline-flex"><LogOut className="size-4" /></Button>
          <Button variant="outline" size="icon-sm" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="lg:hidden">
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

    </header>
    {menuOpen && createPortal(
      <div className="fixed inset-0 z-[100] lg:hidden">
        <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/50" />
        <aside role="dialog" aria-modal="true" aria-label="Menu lateral" className="absolute inset-y-0 left-0 flex max-h-[100dvh] w-[min(20rem,88vw)] flex-col overflow-y-auto border-r border-border bg-background p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="font-heading text-lg font-extrabold">Menu</span>
            <Button variant="ghost" size="icon-sm" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X className="size-4" /></Button>
          </div>
          <div className="flex items-center gap-3 border-b border-border py-5">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <Link href="/perfil" onClick={() => setMenuOpen(false)} className="text-xs text-muted-foreground hover:text-primary">Meu perfil</Link>
            </div>
          </div>
          <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1 py-4">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-5" />{item.label}</Link>;
            })}
            <Link href="/notificacoes" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="size-5" />Notificações{unreadCount > 0 && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </Link>
          </nav>
          <Button variant="outline" className="w-full justify-start" onClick={() => void logout()}><LogOut className="size-4" />Sair da conta</Button>
        </aside>
      </div>,
      document.body
    )}
    </>
  );
}