import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email, token) {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:4317";
  const resetUrl = new URL("/senha/redefinir", frontendUrl);
  resetUrl.searchParams.set("token", token);

  const transporter = nodemailer.createTransport(process.env.SMTP_URL ?? "smtp://localhost:1025");
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "Tribes <no-reply@tribes.local>",
    to: email,
    subject: "Redefina sua senha da Tribes",
    text: `Para escolher uma nova senha para sua conta na Tribes, acesse este link (válido por 30 minutos): ${resetUrl.href}\n\nSe você não pediu a redefinição de senha, ignore esta mensagem.`,
    html: `<p>Para escolher uma nova senha para sua conta na Tribes, acesse o link abaixo. Ele é válido por 30 minutos.</p><p><a href="${resetUrl.href}">Redefinir minha senha</a></p><p>Se você não pediu a redefinição de senha, ignore esta mensagem.</p>`,
  });
}
