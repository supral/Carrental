import type { RentalChannel } from "@/lib/rentals/rental-brand";

interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
}

interface SendEmailInput {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
  rentalChannel?: RentalChannel;
}

function getSmtpConfig(rentalChannel?: RentalChannel) {
  const useEverest = rentalChannel !== "NB_AUTOMOTIVE";

  const host = useEverest
    ? process.env.EVEREST_SMTP_HOST || process.env.SMTP_HOST
    : process.env.NB_SMTP_HOST || process.env.SMTP_HOST;
  const port = Number(
    (useEverest ? process.env.EVEREST_SMTP_PORT : process.env.NB_SMTP_PORT) ||
      process.env.SMTP_PORT ||
      587
  );
  const user = useEverest
    ? process.env.EVEREST_SMTP_USER || process.env.SMTP_USER
    : process.env.NB_SMTP_USER || process.env.SMTP_USER;
  const pass = useEverest
    ? process.env.EVEREST_SMTP_PASS || process.env.SMTP_PASS
    : process.env.NB_SMTP_PASS || process.env.SMTP_PASS;
  const from = useEverest
    ? process.env.EVEREST_SMTP_FROM ||
      process.env.SMTP_FROM ||
      process.env.EVEREST_SMTP_USER ||
      process.env.SMTP_USER ||
      "Everest Car Rental <reservations@everestcarrental.com>"
    : process.env.NB_SMTP_FROM ||
      process.env.SMTP_FROM ||
      process.env.NB_SMTP_USER ||
      process.env.SMTP_USER ||
      "NB Automotive <info@nbautomotive.com.au>";
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465;

  if (!host || !user || !pass) return null;

  return { host, port, user, pass, from, secure };
}

export function isEmailConfigured(): boolean {
  return getSmtpConfig() !== null;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
  rentalChannel,
}: SendEmailInput): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  const smtp = getSmtpConfig(rentalChannel);

  if (!smtp) {
    console.log("[email:dev-fallback]", {
      to: recipients,
      subject,
      text,
      attachments: attachments?.map((item) => item.filename),
    });
    return;
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    ...(smtp.secure
      ? {}
      : {
          requireTLS: true,
          tls: {
            minVersion: "TLSv1.2",
          },
        }),
  });

  await transporter.sendMail({
    from: smtp.from,
    to: recipients.join(", "),
    subject,
    text,
    html: html ?? text.replace(/\n/g, "<br>"),
    attachments,
  });
}
