import { format } from "date-fns";
import { buildBrandedEmailHtml } from "@/lib/email-branding";
import { sendEmail } from "@/lib/email";
import {
  getRentalBrand,
  resolveBookingRentalChannel,
  type RentalChannel,
} from "@/lib/rentals/rental-brand";
import { readUploadBytes } from "@/lib/uploads/rental-file-storage";
import { getAppBaseUrl } from "@/lib/stripe";

/** Customer-facing agreement link — uses the live host (Vercel/local), not a hardcoded brand domain. */
export function buildRentalAgreementUrl(
  bookingId: string,
  token: string,
  _rentalChannel?: RentalChannel | string | null
) {
  return `${getAppBaseUrl()}/rental-agreement/${bookingId}/${token}`;
}

type BaseBookingMail = {
  id: string;
  customerEmail: string | null;
  customerName: string | null;
  pickupAt: Date;
  dropoffAt: Date;
  rentalChannel?: RentalChannel | string | null;
};

function resolveBrand(booking: { rentalChannel?: RentalChannel | string | null }) {
  return getRentalBrand(resolveBookingRentalChannel(booking));
}

export async function sendRentalAgreementRequestEmail(
  booking: BaseBookingMail & { agreementToken: string }
) {
  if (!booking.customerEmail || !booking.agreementToken) return;
  const brand = resolveBrand(booking);
  const channel = brand.channel;
  const url = buildRentalAgreementUrl(booking.id, booking.agreementToken, channel);
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
    brand.name,
  ].join("\n");

  await sendEmail({
    to: booking.customerEmail,
    subject: `Complete your rental agreement — ${brand.name}`,
    text,
    html: buildBrandedEmailHtml({
      title: "Complete your rental agreement",
      brand,
      bodyHtml: `
        <p style="margin:0 0 16px">${name.replace(",", "")} please submit your driver details and digital signature before pickup.</p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:${brand.colors.primary};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">
            Complete Rental Agreement
          </a>
        </p>
        <p style="margin:0">Pickup: ${format(booking.pickupAt, "dd MMM yyyy, h:mm a")}<br/>
        Return: ${format(booking.dropoffAt, "dd MMM yyyy, h:mm a")}</p>
      `,
    }),
    rentalChannel: channel,
  });
}

export async function sendRentalAgreementCompletedEmail(booking: BaseBookingMail) {
  if (!booking.customerEmail) return;
  const brand = resolveBrand(booking);
  const greeting = booking.customerName ?? "there";
  await sendEmail({
    to: booking.customerEmail,
    subject: `Rental agreement received — ${brand.name}`,
    text: `Hi ${greeting},\n\nWe have received your completed rental agreement. Our team will assign a vehicle and prepare your rental agreement PDF.\n\n${brand.name}`,
    html: buildBrandedEmailHtml({
      title: "Rental agreement received",
      brand,
      bodyHtml: `<p style="margin:0">Hi ${greeting}, we have received your completed rental agreement. Our team will assign a vehicle and prepare your rental agreement PDF.</p>`,
    }),
    rentalChannel: brand.channel,
  });
}

export async function sendVehicleReadyEmail(booking: BaseBookingMail & { vehicleLabel: string }) {
  if (!booking.customerEmail) return;
  const brand = resolveBrand(booking);
  const greeting = booking.customerName ?? "there";
  await sendEmail({
    to: booking.customerEmail,
    subject: `Vehicle ready for pickup — ${brand.name}`,
    text: `Hi ${greeting},\n\nYour vehicle (${booking.vehicleLabel}) is ready for pickup on ${format(booking.pickupAt, "dd MMM yyyy, h:mm a")}.\n\n${brand.name}`,
    html: buildBrandedEmailHtml({
      title: "Vehicle ready for pickup",
      brand,
      bodyHtml: `<p style="margin:0">Hi ${greeting}, your vehicle (<strong>${booking.vehicleLabel}</strong>) is ready for pickup on ${format(booking.pickupAt, "dd MMM yyyy, h:mm a")}.</p>`,
    }),
    rentalChannel: brand.channel,
  });
}

export async function sendRentalAgreementPdfEmail(
  booking: BaseBookingMail & { agreementPdfUrl: string }
) {
  if (!booking.customerEmail || !booking.agreementPdfUrl) return;
  const brand = resolveBrand(booking);
  const content = await readUploadBytes(booking.agreementPdfUrl);
  const greeting = booking.customerName ?? "there";
  await sendEmail({
    to: booking.customerEmail,
    subject: `Your rental agreement PDF — ${brand.name}`,
    text: `Hi ${greeting},\n\nPlease find your signed rental agreement attached.\n\n${brand.name}`,
    html: buildBrandedEmailHtml({
      title: "Your rental agreement",
      brand,
      bodyHtml: `<p style="margin:0">Hi ${greeting}, please find your signed rental agreement attached to this email.</p>`,
    }),
    attachments: [
      {
        filename: `rental-agreement-${booking.id}.pdf`,
        content,
        contentType: "application/pdf",
      },
    ],
    rentalChannel: brand.channel,
  });
}

type PostBookingMail = BaseBookingMail & {
  agreementToken?: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  rentalDays: number;
  baseAmountCents: number;
  extrasAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  currency: string;
  selectedOptions: unknown;
  vehicle: {
    title: string | null;
    make: string;
    model: string;
    year: number;
    vehicleNumber: string | null;
  };
};

/** Booking confirmation plus agreement form link when a token is on file. */
export async function sendPostRentalBookingEmails(booking: PostBookingMail) {
  const { sendRentalBookingConfirmationEmail } = await import(
    "@/lib/rentals/rental-booking-email"
  );

  await sendRentalBookingConfirmationEmail(booking).catch((error) => {
    console.error("[rental-booking-email]", error);
  });

  if (booking.agreementToken && booking.customerEmail) {
    await sendRentalAgreementRequestEmail({
      id: booking.id,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      pickupAt: booking.pickupAt,
      dropoffAt: booking.dropoffAt,
      agreementToken: booking.agreementToken,
      rentalChannel: booking.rentalChannel,
    }).catch((error) => {
      console.error("[rental-agreement-request-email]", error);
    });
  }
}

export async function sendRentalClosedEmail(
  booking: BaseBookingMail & { totalChargesLabel: string }
) {
  if (!booking.customerEmail) return;
  const brand = resolveBrand(booking);
  const greeting = booking.customerName ?? "there";
  await sendEmail({
    to: booking.customerEmail,
    subject: `Rental closed — ${brand.name}`,
    text: `Hi ${greeting},\n\nYour rental has been closed. Additional charges: ${booking.totalChargesLabel}.\n\nThank you for choosing ${brand.name}.`,
    html: buildBrandedEmailHtml({
      title: "Rental closed",
      brand,
      bodyHtml: `<p style="margin:0">Hi ${greeting}, your rental has been closed. Additional charges: <strong>${booking.totalChargesLabel}</strong>.</p><p style="margin:16px 0 0">Thank you for choosing ${brand.name}.</p>`,
    }),
    rentalChannel: brand.channel,
  });
}

export async function sendRentalInvoiceEmail(
  invoice: import("@/lib/rentals/rental-invoice").RentalInvoiceInput & {
    rentalChannel?: RentalChannel | string | null;
  }
) {
  if (!invoice.customerEmail) return;

  const {
    buildRentalInvoiceEmailContent,
    generateRentalInvoicePdf,
  } = await import("@/lib/rentals/rental-invoice");

  const { pdfUrl, invoiceNumber } = await generateRentalInvoicePdf(invoice);
  const content = buildRentalInvoiceEmailContent(invoice, invoiceNumber);
  const pdfContent = await readUploadBytes(pdfUrl);
  const channel = resolveBookingRentalChannel({ rentalChannel: invoice.rentalChannel });

  await sendEmail({
    to: invoice.customerEmail,
    subject: content.subject,
    text: content.text,
    html: content.html,
    attachments: [
      {
        filename: `rental-invoice-${invoiceNumber}.pdf`,
        content: pdfContent,
        contentType: "application/pdf",
      },
    ],
    rentalChannel: channel,
  });

  return { pdfUrl, invoiceNumber };
}
