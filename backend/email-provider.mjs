import nodemailer from "nodemailer";

const DEFAULT_EMAIL_FROM = "Tribes <no-reply@tribes.local>";
const RESEND_API_URL = "https://api.resend.com/emails";

export class EmailDeliveryError extends Error {
  constructor(message) {
    super(message);
    this.name = "EmailDeliveryError";
    this.statusCode = 503;
  }
}

function providerFrom(env) {
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase() || "mailhog";
  if (provider !== "mailhog" && provider !== "resend") {
    throw new EmailDeliveryError("EMAIL_PROVIDER deve ser mailhog ou resend.");
  }
  return provider;
}

function senderFrom(env) {
  return env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
}

async function sendWithMailhog(message, env, createTransport) {
  try {
    const transporter = createTransport(env.SMTP_URL || "smtp://localhost:1025");
    await transporter.sendMail({ from: senderFrom(env), ...message });
  } catch {
    throw new EmailDeliveryError("Não foi possível enviar o e-mail pelo MailHog.");
  }
}

async function sendWithResend(message, env, fetchImpl) {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new EmailDeliveryError("RESEND_API_KEY não está configurada no backend.");
  }

  const from = env.EMAIL_FROM?.trim();
  if (!from) {
    throw new EmailDeliveryError("EMAIL_FROM precisa estar configurada para o Resend.");
  }
  if (env.NODE_ENV === "production" && /@resend\.dev\s*>?/i.test(from)) {
    throw new EmailDeliveryError("O remetente onboarding@resend.dev só pode ser usado em testes.");
  }

  const resendMessage = { ...message };
  delete resendMessage.textEncoding;
  let response;
  try {
    response = await fetchImpl(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, ...resendMessage }),
    });
  } catch {
    throw new EmailDeliveryError("Não foi possível conectar ao Resend.");
  }

  if (!response.ok) {
    throw new EmailDeliveryError(
      `O Resend recusou o envio do e-mail (HTTP ${response.status}). Verifique a configuração e as permissões da conta.`
    );
  }
}

export async function sendEmail(message, {
  env = process.env,
  fetchImpl = globalThis.fetch,
  createTransport = nodemailer.createTransport,
} = {}) {
  const provider = providerFrom(env);
  if (provider === "resend") {
    await sendWithResend(message, env, fetchImpl);
    return;
  }
  await sendWithMailhog(message, env, createTransport);
}
