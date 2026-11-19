import { Suspense } from "react";
import { RegistrationConfirmationForm } from "@/components/social/registration-confirmation-form";

async function RegistrationConfirmation({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <RegistrationConfirmationForm token={token ?? ""} />;
}

export default function ConfirmRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense fallback={<p role="status" className="mx-auto max-w-md py-12 text-center text-sm text-muted-foreground">Carregando confirmação...</p>}>
      <RegistrationConfirmation searchParams={searchParams} />
    </Suspense>
  );
}
