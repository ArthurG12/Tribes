import nodemailer from "nodemailer";

export async function sendRegistrationEmail(email, token) {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:4317";
  const confirmationUrl = new URL("/cadastro/confirmar", frontendUrl);
  confirmationUrl.searchParams.set("token", token);

  const transporter = nodemailer.createTransport(process.env.SMTP_URL ?? "smtp://localhost:1025");
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "Tribes <no-reply@tribes.local>",
    to: email,
    textEncoding: "base64",
    subject: "Crie sua conta na Tribes",
    text: `Para escolher seu nome e senha e criar sua conta na Tribes, acesse este link (válido por 30 minutos): ${confirmationUrl.href}\n\nSe você não pediu este cadastro, ignore esta mensagem.`,
    html: `<p>Para escolher seu nome e senha e criar sua conta na Tribes, acesse o link abaixo. Ele é válido por 30 minutos.</p><p><a href="${confirmationUrl.href}">Criar minha conta</a></p><p>Se você não pediu este cadastro, ignore esta mensagem.</p>`,
  });
}
