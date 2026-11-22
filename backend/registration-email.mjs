import { sendEmail } from "./email-provider.mjs";

export async function sendRegistrationEmail(email, token, options = {}) {
  const env = options.env ?? process.env;
  const frontendUrl = env.FRONTEND_URL ?? "http://localhost:4317";
  const confirmationUrl = new URL("/cadastro/confirmar", frontendUrl);
  confirmationUrl.searchParams.set("token", token);

  await sendEmail({
    to: email,
    textEncoding: "base64",
    subject: "Crie sua conta na Tribes",
    text: `Para escolher seu nome e senha e criar sua conta na Tribes, acesse este link (válido por 30 minutos): ${confirmationUrl.href}\n\nSe você não pediu este cadastro, ignore esta mensagem.`,
    html: `<p>Para escolher seu nome e senha e criar sua conta na Tribes, acesse o link abaixo. Ele é válido por 30 minutos.</p><p><a href="${confirmationUrl.href}">Criar minha conta</a></p><p>Se você não pediu este cadastro, ignore esta mensagem.</p>`,
  }, options);
}
