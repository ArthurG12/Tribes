import { sendEmail } from "./email-provider.mjs";

export async function sendPasswordResetEmail(email, token, options = {}) {
  const env = options.env ?? process.env;
  const frontendUrl = env.FRONTEND_URL ?? "http://localhost:4317";
  const resetUrl = new URL("/senha/redefinir", frontendUrl);
  resetUrl.searchParams.set("token", token);

  await sendEmail({
    to: email,
    textEncoding: "base64",
    subject: "Redefina sua senha da Tribes",
    text: `Para escolher uma nova senha para sua conta na Tribes, acesse este link (válido por 30 minutos): ${resetUrl.href}\n\nSe você não pediu a redefinição de senha, ignore esta mensagem.`,
    html: `<p>Para escolher uma nova senha para sua conta na Tribes, acesse o link abaixo. Ele é válido por 30 minutos.</p><p><a href="${resetUrl.href}">Redefinir minha senha</a></p><p>Se você não pediu a redefinição de senha, ignore esta mensagem.</p>`,
  }, options);
}
