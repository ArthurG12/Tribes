"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Compass, Flame, LogOut, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/components/social/auth-guard";
import { UserAvatar } from "@/components/social/user-avatar";

export function SocialHeader({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    let active = true;
    const loadUnread = () => fetch("/api/notifications", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ unreadCount: number }> : null)
      .then((data) => { if (active && data) setUnreadCount(data.unreadCount); })
      .catch(() => undefined);
    void loadUnread();
    const interval = window.setInterval(() => void loadUnread(), 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [pathname]);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }
  const nav = [
    { href: "/feed", label: "Feed", icon: Flame },
    { href: "/tribos", label: "Explorar tribos", icon: Compass },
    { href: "/minhas-tribos", label: "Minhas tribos", icon: Users },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/feed" className="flex shrink-0 items-center gap-2 font-heading text-lg font-extrabold">
          <span className="relative h-12 w-[7.25rem] shrink-0 overflow-hidden">
            <Image
              src="/tribes-logo.png"
              alt="Tribes"
              fill
              sizes="116px"
              className="object-contain"
            />
          </span>
        </Link>
        <nav aria-label="Navegação principal" className="flex items-center gap-1 sm:gap-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/minhas-tribos" && pathname.startsWith("/minhas-tribos/"));
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="size-4" /><span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/notificacoes" aria-label={unreadCount ? `Notificações, ${unreadCount} não lidas` : "Notificações"} className="relative inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Bell className="size-4" />
            {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </Link>
          <Link href="/perfil" aria-label="Meu perfil" className="flex min-w-0 items-center gap-2 rounded-xl p-1 transition-colors hover:bg-muted">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="size-8 text-xs" />
            <span className="hidden max-w-32 truncate text-xs font-medium text-muted-foreground md:inline">{user.name}</span>
          </Link>
          <Button variant="ghost" size="icon-sm" aria-label="Sair da conta" onClick={() => void logout()}><LogOut className="size-4" /></Button>
        </div>
      </div>
    </header>
  );
}
