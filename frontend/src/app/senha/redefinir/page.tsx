import { Suspense } from "react";
import { PasswordResetForm } from "@/components/social/password-reset-form";

async function PasswordReset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <PasswordResetForm token={token ?? ""} />;
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense fallback={<p role="status" className="mx-auto max-w-md py-12 text-center text-sm text-muted-foreground">Carregando redefinição de senha...</p>}>
      <PasswordReset searchParams={searchParams} />
    </Suspense>
  );
}
