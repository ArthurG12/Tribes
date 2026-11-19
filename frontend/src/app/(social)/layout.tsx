import { AuthGuard } from "@/components/social/auth-guard";

export default function SocialLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthGuard>{children}</AuthGuard>;
}
