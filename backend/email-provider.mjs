import nodemailer from "nodemailer";

const DEFAULT_EMAIL_FROM = "Tribes <no-reply@tribes.local>";
const RESEND_API_URL = "https://api.resend.com/emails";

export class EmailDeliveryError extends Error {
  constructor(message, { providerCode = null, retryable = true } = {}) {
    super(message);
    this.name = "EmailDeliveryError";
    this.statusCode = 503;
    this.providerCode = providerCode;
    this.retryable = retryable;
  }
}

function providerFrom(env) {
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase() || "mailhog";
  if (provider !== "mailhog" && provider !== "resend") {
    throw new EmailDeliveryError("EMAIL_PROVIDER deve ser mailhog ou resend.", { retryable: false });
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
    throw new EmailDeliveryError("RESEND_API_KEY não está configurada no backend.", { retryable: false });
  }

  const from = env.EMAIL_FROM?.trim();
  if (!from) {
    throw new EmailDeliveryError("EMAIL_FROM precisa estar configurada para o Resend.", { retryable: false });
  }
  if (env.NODE_ENV === "production" && /@resend\.dev\s*>?/i.test(from)) {
    throw new EmailDeliveryError("O remetente onboarding@resend.dev só pode ser usado em testes.", { retryable: false });
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
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new EmailDeliveryError("Não foi possível conectar ao Resend.");
  }

  if (!response.ok) {
    let providerCode = null;
    try {
      const body = await response.json();
      providerCode = body?.code ?? body?.name ?? body?.error?.code ?? body?.error?.name ?? null;
    } catch {}
    throw new EmailDeliveryError(
      `O Resend recusou o envio do e-mail (HTTP ${response.status}). Verifique a configuração e as permissões da conta.`,
      {
        providerCode,
        retryable: response.status >= 500 || response.status === 429,
      }
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
