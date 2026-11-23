"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { SocialHeader } from "@/components/social/social-header";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  aboutMe: string;
  city: string;
  interests: string[];
  profileVisibility: { aboutMe: "public" | "followers" | "private"; city: "public" | "followers" | "private"; interests: "public" | "followers" | "private" };
  avatarUrl: string | null;
}

const CurrentUserContext = createContext<{
  user: CurrentUser;
  setUser: React.Dispatch<React.SetStateAction<CurrentUser | null>>;
} | null>(null);

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (!context) throw new Error("useCurrentUser deve ser usado dentro de AuthGuard.");
  return context;
}

export function AuthLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center text-primary">
      <Image src="/tribes-emblem.png" alt="Carregando Tribes" width={32} height={32} className="size-8 animate-pulse object-contain" />
    </div>
  );
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
    return <AuthLoadingState />;
  }

  return (
    <div className="min-h-screen bg-background">
      <CurrentUserContext.Provider value={{ user, setUser }}>
        <SocialHeader user={user} />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">{children}</div>
      </CurrentUserContext.Provider>
    </div>
  );
}
