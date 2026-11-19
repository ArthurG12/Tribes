"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Flame, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/components/social/auth-guard";

export function SocialHeader({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }
  const nav = [
    { href: "/feed", label: "Feed", icon: Flame },
    { href: "/tribos", label: "Explorar tribos", icon: Compass },
    { href: "/tribos/nova", label: "Criar tribo", icon: Plus },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/feed" className="flex shrink-0 items-center gap-2 font-heading text-lg font-extrabold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Flame className="size-5 fill-current" /></span>
          <span className="hidden sm:inline">tribes</span>
        </Link>
        <nav aria-label="Navegação principal" className="flex items-center gap-1 sm:gap-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/tribos" && pathname.startsWith("/tribos/"));
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="size-4" /><span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden max-w-32 truncate text-xs font-medium text-muted-foreground md:inline">{user.name}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Sair da conta" onClick={() => void logout()}><LogOut className="size-4" /></Button>
        </div>
      </div>
    </header>
  );
}
