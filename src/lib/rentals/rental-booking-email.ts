import { format } from "date-fns";
import { buildBrandedEmailHtml } from "@/lib/email-branding";
import { sendEmail } from "@/lib/email";
import { getRentalBrand, resolveBookingRentalChannel } from "@/lib/rentals/rental-brand";
import { parsePricedRentalOptionLines } from "@/lib/rentals/option-catalog";
import { formatVehicleName } from "@/lib/vehicles/display";

type RentalBookingEmailInput = {
  id: string;
  customerEmail: string | null;
  customerName: string | null;
  rentalChannel?: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: Date;
  dropoffAt: Date;
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

function formatAud(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function sendRentalBookingConfirmationEmail(
  booking: RentalBookingEmailInput
): Promise<void> {
  if (!booking.customerEmail) {
    return;
  }

  const brand = getRentalBrand(resolveBookingRentalChannel(booking));
  const vehicleName = formatVehicleName(booking.vehicle);
  const optionLines = parsePricedRentalOptionLines(booking.selectedOptions);
  const greeting = booking.customerName ? `Hi ${booking.customerName},` : "Hi there,";
  const pickupLabel = format(booking.pickupAt, "dd MMM yyyy, h:mm a");
  const dropoffLabel = format(booking.dropoffAt, "dd MMM yyyy, h:mm a");

  const textLines = [
    greeting,
    "",
    `Your rental booking with ${brand.name} is confirmed.`,
    "",
    `Booking reference: ${booking.id}`,
    `Vehicle: ${vehicleName}`,
    `Rental period: ${booking.rentalDays} day${booking.rentalDays === 1 ? "" : "s"}`,
    `Pickup: ${pickupLabel}`,
    `Pickup location: ${booking.pickupAddress}`,
    `Drop-off: ${dropoffLabel}`,
    `Drop-off location: ${booking.dropoffAddress}`,
    "",
    `Vehicle rental: ${formatAud(booking.baseAmountCents)}`,
  ];

  if (booking.extrasAmountCents > 0) {
    textLines.push(`Extras: ${formatAud(booking.extrasAmountCents)}`);
    for (const line of optionLines) {
      textLines.push(`  - ${line.label}${line.quantity > 1 ? ` × ${line.quantity}` : ""}`);
    }
  }

  if (booking.taxAmountCents > 0) {
    textLines.push(`Tax: ${formatAud(booking.taxAmountCents)}`);
  }

  textLines.push(
    `Total paid: ${formatAud(booking.totalAmountCents)} ${booking.currency.toUpperCase()}`,
    "",
    "Please bring your driving licence and the payment card used for booking when collecting the vehicle.",
    "",
    `Questions? Contact us at ${brand.email} or ${brand.phone}.`,
    "",
    brand.name
  );

  const text = textLines.join("\n");

  const html = buildBrandedEmailHtml({
    title: "Booking confirmed",
    brand,
    bodyHtml: `
      <p style="margin:0 0 16px">${greeting.replace(",", "")}, your rental booking with <strong>${brand.name}</strong> is confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
        <tr><td style="padding:8px 0;font-weight:600;width:160px">Reference</td><td>${booking.id}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Vehicle</td><td>${vehicleName}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Pickup</td><td>${pickupLabel}<br>${booking.pickupAddress}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Drop-off</td><td>${dropoffLabel}<br>${booking.dropoffAddress}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Total paid</td><td>${formatAud(booking.totalAmountCents)} ${booking.currency.toUpperCase()}</td></tr>
      </table>
      ${
        optionLines.length > 0
          ? `<h3 style="margin:0 0 8px;font-size:16px;color:${brand.colors.accent}">Selected options</h3><ul style="margin:0 0 16px;padding-left:20px">${optionLines
              .map(
                (line) =>
                  `<li>${line.label}${line.quantity > 1 ? ` × ${line.quantity}` : ""}</li>`
              )
              .join("")}</ul>`
          : ""
      }
      <p style="margin:0 0 8px">Please bring your driving licence and the payment card used for booking when collecting the vehicle.</p>
      <p style="margin:0">Questions? Contact us at <a href="mailto:${brand.email}" style="color:${brand.colors.primary}">${brand.email}</a> or ${brand.phone}.</p>
    `,
  });

  await sendEmail({
    to: booking.customerEmail,
    subject: `Booking confirmed — ${vehicleName}`,
    text,
    html,
    rentalChannel: brand.channel,
  });
}
