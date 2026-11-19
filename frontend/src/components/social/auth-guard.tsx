"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { SocialHeader } from "@/components/social/social-header";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("not-authenticated");
        return response.json() as Promise<{ user: CurrentUser | null }>;
      })
      .then(({ user: authenticatedUser }) => {
        if (!active) return;
        if (!authenticatedUser) {
          router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setUser(authenticatedUser);
        setLoaded(true);
      })
      .catch(() => {
        if (active) router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
      });
    return () => { active = false; };
  }, [pathname, router]);

  if (!loaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-primary">
        <Flame className="size-8 animate-pulse fill-current" aria-label="Carregando Tribes" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SocialHeader user={user} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">{children}</div>
    </div>
  );
}
