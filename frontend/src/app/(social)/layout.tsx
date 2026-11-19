import { Suspense } from "react";
import { AuthGuard, AuthLoadingState } from "@/components/social/auth-guard";

export default function SocialLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<AuthLoadingState />}>
      <AuthGuard>{children}</AuthGuard>
    </Suspense>
  );
}
