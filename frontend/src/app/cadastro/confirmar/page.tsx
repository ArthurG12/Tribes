import { RegistrationConfirmationForm } from "@/components/social/registration-confirmation-form";

export default async function ConfirmRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <RegistrationConfirmationForm token={token ?? ""} />;
}
