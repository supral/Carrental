interface SendEmailInput {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "reservations@everestcarrental.com";

  if (!host || !user || !pass) return null;

  return { host, port, user, pass, from };
}

export function isEmailConfigured(): boolean {
  return getSmtpConfig() !== null;
}

export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  const smtp = getSmtpConfig();

  if (!smtp) {
    console.log("[email:dev-fallback]", {
      to: recipients,
      subject,
      text,
    });
    return;
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: smtp.from,
    to: recipients.join(", "),
    subject,
    text,
    html: html ?? text.replace(/\n/g, "<br>"),
  });
}
