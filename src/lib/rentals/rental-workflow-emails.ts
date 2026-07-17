import { format } from "date-fns";
import { siteConfig } from "@/data/services";
import { sendEmail } from "@/lib/email";
import { publicUrlToAbsolutePath } from "@/lib/uploads/rental-file-storage";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

export function buildRentalAgreementUrl(bookingId: string, token: string) {
  return `${appBaseUrl()}/rental-agreement/${bookingId}/${token}`;
}

type BaseBookingMail = {
  id: string;
  customerEmail: string | null;
  customerName: string | null;
  pickupAt: Date;
  dropoffAt: Date;
};

export async function sendRentalAgreementRequestEmail(
  booking: BaseBookingMail & { agreementToken: string }
) {
  if (!booking.customerEmail || !booking.agreementToken) return;
  const url = buildRentalAgreementUrl(booking.id, booking.agreementToken);
  const name = booking.customerName ? `Hi ${booking.customerName},` : "Hi there,";
  const text = [
    name,
    "",
    "Your booking is confirmed. Please complete your digital rental agreement before pickup.",
    "",
    `Complete Rental Agreement: ${url}`,
    "",
    `Pickup: ${format(booking.pickupAt, "dd MMM yyyy, h:mm a")}`,
    `Return: ${format(booking.dropoffAt, "dd MMM yyyy, h:mm a")}`,
    "",
    siteConfig.name,
  ].join("\n");

  await sendEmail({
    to: booking.customerEmail,
    subject: `Complete your rental agreement — ${siteConfig.name}`,
    text,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:640px;color:#111">
        <h2>Complete your rental agreement</h2>
        <p>${name.replace(",", "")} please submit your driver details and digital signature before pickup.</p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">
            Complete Rental Agreement
          </a>
        </p>
        <p>Pickup: ${format(booking.pickupAt, "dd MMM yyyy, h:mm a")}<br/>
        Return: ${format(booking.dropoffAt, "dd MMM yyyy, h:mm a")}</p>
      </div>
    `,
  });
}

export async function sendRentalAgreementCompletedEmail(booking: BaseBookingMail) {
  if (!booking.customerEmail) return;
  await sendEmail({
    to: booking.customerEmail,
    subject: `Rental agreement received — ${siteConfig.name}`,
    text: `Hi ${booking.customerName ?? "there"},\n\nWe have received your completed rental agreement. Our team will assign a vehicle and prepare your rental agreement PDF.\n\n${siteConfig.name}`,
  });
}

export async function sendVehicleReadyEmail(booking: BaseBookingMail & { vehicleLabel: string }) {
  if (!booking.customerEmail) return;
  await sendEmail({
    to: booking.customerEmail,
    subject: `Vehicle ready for pickup — ${siteConfig.name}`,
    text: `Hi ${booking.customerName ?? "there"},\n\nYour vehicle (${booking.vehicleLabel}) is ready for pickup on ${format(booking.pickupAt, "dd MMM yyyy, h:mm a")}.\n\n${siteConfig.name}`,
  });
}

export async function sendRentalAgreementPdfEmail(
  booking: BaseBookingMail & { agreementPdfUrl: string }
) {
  if (!booking.customerEmail || !booking.agreementPdfUrl) return;
  const abs = publicUrlToAbsolutePath(booking.agreementPdfUrl);
  await sendEmail({
    to: booking.customerEmail,
    subject: `Your rental agreement PDF — ${siteConfig.name}`,
    text: `Hi ${booking.customerName ?? "there"},\n\nPlease find your signed rental agreement attached.\n\n${siteConfig.name}`,
    attachments: [
      {
        filename: `rental-agreement-${booking.id}.pdf`,
        path: abs,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendRentalClosedEmail(
  booking: BaseBookingMail & { totalChargesLabel: string }
) {
  if (!booking.customerEmail) return;
  await sendEmail({
    to: booking.customerEmail,
    subject: `Rental closed — ${siteConfig.name}`,
    text: `Hi ${booking.customerName ?? "there"},\n\nYour rental has been closed. Additional charges: ${booking.totalChargesLabel}.\n\nThank you for choosing ${siteConfig.name}.`,
  });
}

export async function sendRentalInvoiceEmail(
  invoice: import("@/lib/rentals/rental-invoice").RentalInvoiceInput
) {
  if (!invoice.customerEmail) return;

  const {
    buildRentalInvoiceEmailContent,
    generateRentalInvoicePdf,
  } = await import("@/lib/rentals/rental-invoice");

  const { pdfUrl, invoiceNumber } = await generateRentalInvoicePdf(invoice);
  const content = buildRentalInvoiceEmailContent(invoice, invoiceNumber);
  const abs = publicUrlToAbsolutePath(pdfUrl);

  await sendEmail({
    to: invoice.customerEmail,
    subject: content.subject,
    text: content.text,
    html: content.html,
    attachments: [
      {
        filename: `rental-invoice-${invoiceNumber}.pdf`,
        path: abs,
        contentType: "application/pdf",
      },
    ],
  });

  return { pdfUrl, invoiceNumber };
}
