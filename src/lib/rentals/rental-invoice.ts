import { createHash, randomBytes } from "crypto";
import { format } from "date-fns";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { siteConfig } from "@/data/services";
import { saveBinaryUpload } from "@/lib/uploads/rental-file-storage";

export type RentalInvoiceLine = {
  label: string;
  amountCents: number;
  note?: string;
};

export type RentalInvoiceInput = {
  bookingId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  vehicleLabel: string;
  fleetLabel?: string | null;
  registration?: string | null;
  pickupAt: Date;
  dropoffAt: Date;
  returnedAt?: Date | null;
  rentalDays: number;
  dailyRateCents: number;
  dailyLimitKm?: number | null;
  excessKmRateCents?: number | null;
  bondCents: number;
  baseAmountCents: number;
  extrasAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  paymentStatus: string;
  kmOut?: number | null;
  kmIn?: number | null;
  fuelOut?: string | null;
  fuelIn?: string | null;
  insuranceNotes?: string | null;
  extraKmChargeCents: number;
  fuelChargeCents: number;
  lateFeeCents: number;
  damageChargeCents: number;
  outstandingBalanceCents: number;
  damageNotes?: string | null;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BRAND = rgb(0.04, 0.3, 0.55);
const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.4, 0.45, 0.5);
const LINE = rgb(0.82, 0.86, 0.9);
const TOTAL_BG = rgb(0.93, 0.96, 0.99);

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildInvoiceNumber(bookingId: string): string {
  const stamp = format(new Date(), "yyyyMMdd");
  const short = bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "XXXXXX";
  const salt = randomBytes(2).toString("hex").toUpperCase();
  return `INV-${stamp}-${short}-${salt}`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function buildInvoiceLineItems(input: RentalInvoiceInput): {
  bookingLines: RentalInvoiceLine[];
  returnLines: RentalInvoiceLine[];
  paidAtBookingCents: number;
  returnChargesCents: number;
  amountDueCents: number;
  grandTotalCents: number;
} {
  const daily = input.dailyRateCents || 0;
  const days = Math.max(1, input.rentalDays || 1);
  const rentalSubtotal = daily > 0 ? daily * days : input.baseAmountCents;

  const bookingLines: RentalInvoiceLine[] = [
    {
      label:
        daily > 0
          ? `Vehicle rental (${money(daily)} × ${days} day${days === 1 ? "" : "s"})`
          : "Vehicle rental",
      amountCents: rentalSubtotal,
    },
  ];

  if (input.extrasAmountCents > 0) {
    bookingLines.push({
      label: "Insurance & extras",
      amountCents: input.extrasAmountCents,
      note: input.insuranceNotes || undefined,
    });
  }

  if (input.taxAmountCents > 0) {
    bookingLines.push({ label: "GST / tax", amountCents: input.taxAmountCents });
  }

  const returnLines: RentalInvoiceLine[] = [];
  if (input.extraKmChargeCents > 0) {
    returnLines.push({ label: "Extra kilometres", amountCents: input.extraKmChargeCents });
  }
  if (input.fuelChargeCents > 0) {
    returnLines.push({
      label: "Fuel charge",
      amountCents: input.fuelChargeCents,
      note:
        input.fuelOut && input.fuelIn
          ? `Returned ${input.fuelIn} (out ${input.fuelOut})`
          : undefined,
    });
  }
  if (input.lateFeeCents > 0) {
    returnLines.push({ label: "Late return fee", amountCents: input.lateFeeCents });
  }
  if (input.damageChargeCents > 0) {
    returnLines.push({
      label: "Damage / repair charge",
      amountCents: input.damageChargeCents,
      note: input.damageNotes || undefined,
    });
  }

  const paidAtBookingCents = input.totalAmountCents;
  const returnChargesCents = returnLines.reduce((sum, line) => sum + line.amountCents, 0);
  const amountDueCents = Math.max(0, input.outstandingBalanceCents);
  const grandTotalCents = paidAtBookingCents + returnChargesCents;

  return {
    bookingLines,
    returnLines,
    paidAtBookingCents,
    returnChargesCents,
    amountDueCents,
    grandTotalCents,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildRentalInvoiceEmailContent(
  input: RentalInvoiceInput,
  invoiceNumber: string
): { subject: string; text: string; html: string } {
  const name = input.customerName ?? "there";
  const lines = buildInvoiceLineItems(input);
  const pickup = format(input.pickupAt, "dd MMM yyyy, h:mm a");
  const dropoff = format(input.dropoffAt, "dd MMM yyyy, h:mm a");
  const returned = input.returnedAt
    ? format(input.returnedAt, "dd MMM yyyy, h:mm a")
    : "—";

  const textRows = [
    `Hi ${name},`,
    "",
    `Please find your rental invoice from ${siteConfig.name}.`,
    "",
    `Invoice: ${invoiceNumber}`,
    `Booking: ${input.bookingId}`,
    `Vehicle: ${input.vehicleLabel}`,
    input.fleetLabel ? `Fleet unit: ${input.fleetLabel}` : null,
    input.registration ? `Registration: ${input.registration}` : null,
    `Pickup: ${pickup}`,
    `Scheduled return: ${dropoff}`,
    `Returned: ${returned}`,
    "",
    "— Booking charges —",
    ...lines.bookingLines.map((line) => `${line.label}: ${money(line.amountCents)}`),
    `Total paid at booking: ${money(lines.paidAtBookingCents)}`,
    "",
    `Bond held (security): ${money(input.bondCents)}`,
    "Bond is held as security and released subject to vehicle condition and outstanding charges.",
    "",
    ...(input.dailyLimitKm != null ? [`Daily KM allowance: ${input.dailyLimitKm} km`] : []),
    ...(input.excessKmRateCents != null
      ? [`Excess KM rate: ${money(input.excessKmRateCents)}/km`]
      : []),
    ...(input.kmOut != null && input.kmIn != null
      ? [`Odometer: ${input.kmOut} → ${input.kmIn} km`]
      : []),
    "",
    "— Return charges —",
    ...(lines.returnLines.length
      ? lines.returnLines.map((line) => `${line.label}: ${money(line.amountCents)}`)
      : ["No additional return charges"]),
    `Return charges total: ${money(lines.returnChargesCents)}`,
    "",
    `Grand total (paid + return charges): ${money(lines.grandTotalCents)}`,
    `Amount due now: ${money(lines.amountDueCents)}`,
    `Booking payment status: ${input.paymentStatus}`,
    "",
    `Questions? ${siteConfig.email} · ${siteConfig.phone}`,
    siteConfig.address,
    "",
    siteConfig.name,
  ].filter((row): row is string => row != null);

  const lineHtml = (items: RentalInvoiceLine[]) =>
    items
      .map(
        (line) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827">
          ${escapeHtml(line.label)}
          ${
            line.note
              ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">${escapeHtml(line.note)}</div>`
              : ""
          }
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;white-space:nowrap">${money(line.amountCents)}</td>
      </tr>`
      )
      .join("");

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:#111827;max-width:680px;margin:0 auto">
    <div style="background:#0A4D8C;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
      <div style="font-size:13px;opacity:.9;letter-spacing:.04em;text-transform:uppercase">Tax invoice / statement</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">${escapeHtml(siteConfig.name)}</div>
      <div style="font-size:13px;margin-top:8px;opacity:.95">${escapeHtml(invoiceNumber)}</div>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px">
      <p style="margin:0 0 16px">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 20px">Your rental has been returned. Below is a full summary of money charged, bond held, and any amount still due.</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
        <tr><td style="padding:4px 0;color:#6b7280;width:140px">Booking</td><td>${escapeHtml(input.bookingId)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Vehicle</td><td>${escapeHtml(input.vehicleLabel)}</td></tr>
        ${input.fleetLabel ? `<tr><td style="padding:4px 0;color:#6b7280">Fleet unit</td><td>${escapeHtml(input.fleetLabel)}</td></tr>` : ""}
        ${input.registration ? `<tr><td style="padding:4px 0;color:#6b7280">Registration</td><td>${escapeHtml(input.registration)}</td></tr>` : ""}
        <tr><td style="padding:4px 0;color:#6b7280">Pickup</td><td>${escapeHtml(pickup)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Returned</td><td>${escapeHtml(returned)}</td></tr>
      </table>

      <h3 style="margin:0 0 8px;font-size:15px;color:#0A4D8C">Booking charges</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:14px">
        ${lineHtml(lines.bookingLines)}
        <tr>
          <td style="padding:12px 0;font-weight:700">Paid at booking</td>
          <td style="padding:12px 0;text-align:right;font-weight:700">${money(lines.paidAtBookingCents)}</td>
        </tr>
      </table>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:16px 0">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Bond held</div>
        <div style="font-size:20px;font-weight:700;color:#0A4D8C;margin:4px 0 8px">${money(input.bondCents)}</div>
        <div style="font-size:12px;color:#64748b">
          Security deposit held against damage, fuel, excess KM and late return. Released when the vehicle is clear and any outstanding amount is paid.
        </div>
        ${
          input.dailyLimitKm != null || input.excessKmRateCents != null
            ? `<div style="margin-top:10px;font-size:12px;color:#64748b">
                ${input.dailyLimitKm != null ? `Daily KM: ${input.dailyLimitKm}` : ""}
                ${input.dailyLimitKm != null && input.excessKmRateCents != null ? " · " : ""}
                ${input.excessKmRateCents != null ? `Excess KM: ${money(input.excessKmRateCents)}/km` : ""}
              </div>`
            : ""
        }
      </div>

      <h3 style="margin:20px 0 8px;font-size:15px;color:#0A4D8C">Return charges</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:14px">
        ${
          lines.returnLines.length
            ? lineHtml(lines.returnLines)
            : `<tr><td style="padding:10px 0;color:#6b7280" colspan="2">No additional return charges</td></tr>`
        }
        <tr>
          <td style="padding:12px 0;font-weight:700">Return charges total</td>
          <td style="padding:12px 0;text-align:right;font-weight:700">${money(lines.returnChargesCents)}</td>
        </tr>
      </table>

      <div style="background:#0A4D8C;color:#fff;border-radius:10px;padding:16px;margin-top:16px">
        <table style="width:100%;border-collapse:collapse;color:#fff;font-size:14px">
          <tr>
            <td style="padding:4px 0">Grand total (booking + return)</td>
            <td style="padding:4px 0;text-align:right;font-weight:600">${money(lines.grandTotalCents)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 0;font-size:16px;font-weight:700">Amount due now</td>
            <td style="padding:8px 0 0;text-align:right;font-size:20px;font-weight:700">${money(lines.amountDueCents)}</td>
          </tr>
        </table>
      </div>

      <p style="margin:20px 0 0;font-size:13px;color:#6b7280">
        ${escapeHtml(siteConfig.name)} · ${escapeHtml(siteConfig.address)}<br/>
        ${escapeHtml(siteConfig.email)} · ${escapeHtml(siteConfig.phone)}
        ${siteConfig.abn ? `<br/>ABN ${escapeHtml(siteConfig.abn)}` : ""}
      </p>
    </div>
  </div>`;

  return {
    subject: `Rental invoice ${invoiceNumber} — ${siteConfig.name}`,
    text: textRows.join("\n"),
    html,
  };
}

function drawLineRow(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  label: string,
  amount: string,
  y: number,
  opts?: { bold?: boolean; mute?: boolean }
): number {
  page.drawText(label.slice(0, 70), {
    x: MARGIN,
    y,
    size: opts?.bold ? 10 : 9,
    font: opts?.bold ? fonts.bold : fonts.regular,
    color: opts?.mute ? MUTED : INK,
  });
  page.drawText(amount, {
    x: PAGE_W - MARGIN - 70,
    y,
    size: opts?.bold ? 10 : 9,
    font: fonts.bold,
    color: INK,
  });
  return y - 16;
}

/** Generate a one-page production rental invoice PDF. */
export async function generateRentalInvoicePdf(
  input: RentalInvoiceInput
): Promise<{ pdfUrl: string; invoiceNumber: string }> {
  const invoiceNumber = buildInvoiceNumber(input.bookingId);
  const lines = buildInvoiceLineItems(input);
  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  page.drawRectangle({
    x: 0,
    y: PAGE_H - 72,
    width: PAGE_W,
    height: 72,
    color: BRAND,
  });
  page.drawText(siteConfig.name.toUpperCase(), {
    x: MARGIN,
    y: PAGE_H - 34,
    size: 16,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("TAX INVOICE / STATEMENT", {
    x: MARGIN,
    y: PAGE_H - 52,
    size: 9,
    font: fonts.regular,
    color: rgb(0.85, 0.9, 0.95),
  });
  page.drawText(invoiceNumber, {
    x: PAGE_W - MARGIN - 150,
    y: PAGE_H - 38,
    size: 10,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(format(new Date(), "dd MMM yyyy"), {
    x: PAGE_W - MARGIN - 150,
    y: PAGE_H - 52,
    size: 9,
    font: fonts.regular,
    color: rgb(0.85, 0.9, 0.95),
  });

  let y = PAGE_H - 100;
  page.drawText("Bill to", {
    x: MARGIN,
    y,
    size: 8,
    font: fonts.bold,
    color: MUTED,
  });
  y -= 14;
  page.drawText(input.customerName || "Customer", {
    x: MARGIN,
    y,
    size: 11,
    font: fonts.bold,
    color: INK,
  });
  y -= 13;
  if (input.customerEmail) {
    page.drawText(input.customerEmail, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: INK,
    });
    y -= 12;
  }
  if (input.customerPhone) {
    page.drawText(input.customerPhone, {
      x: MARGIN,
      y,
      size: 9,
      font: fonts.regular,
      color: INK,
    });
    y -= 12;
  }
  if (input.customerAddress) {
    for (const line of wrapText(input.customerAddress, fonts.regular, 9, 240)) {
      page.drawText(line, { x: MARGIN, y, size: 9, font: fonts.regular, color: INK });
      y -= 12;
    }
  }

  let metaY = PAGE_H - 100;
  const metaX = MARGIN + 280;
  const meta: Array<[string, string]> = [
    ["Booking", input.bookingId.slice(0, 22)],
    ["Vehicle", input.vehicleLabel.slice(0, 36)],
    ...(input.fleetLabel ? [["Fleet", input.fleetLabel.slice(0, 36)] as [string, string]] : []),
    ...(input.registration
      ? [["Rego", input.registration.slice(0, 20)] as [string, string]]
      : []),
    ["Pickup", format(input.pickupAt, "dd MMM yyyy, h:mm a")],
    [
      "Returned",
      input.returnedAt ? format(input.returnedAt, "dd MMM yyyy, h:mm a") : "—",
    ],
  ];
  for (const [label, value] of meta) {
    page.drawText(label, { x: metaX, y: metaY, size: 8, font: fonts.regular, color: MUTED });
    page.drawText(value, {
      x: metaX + 70,
      y: metaY,
      size: 8,
      font: fonts.bold,
      color: INK,
    });
    metaY -= 12;
  }

  y = Math.min(y, metaY) - 16;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: BRAND,
  });
  y -= 22;

  page.drawText("BOOKING CHARGES", {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.bold,
    color: BRAND,
  });
  y -= 18;
  for (const line of lines.bookingLines) {
    y = drawLineRow(page, fonts, line.label, money(line.amountCents), y);
  }
  y = drawLineRow(page, fonts, "Paid at booking", money(lines.paidAtBookingCents), y - 4, {
    bold: true,
  });

  y -= 10;
  page.drawRectangle({
    x: MARGIN,
    y: y - 46,
    width: CONTENT_W,
    height: 52,
    color: TOTAL_BG,
    borderColor: LINE,
    borderWidth: 0.8,
  });
  page.drawText("BOND HELD (SECURITY)", {
    x: MARGIN + 12,
    y: y - 16,
    size: 8,
    font: fonts.bold,
    color: MUTED,
  });
  page.drawText(money(input.bondCents), {
    x: MARGIN + 12,
    y: y - 34,
    size: 16,
    font: fonts.bold,
    color: BRAND,
  });
  page.drawText("Held against damage, fuel, excess KM and late return.", {
    x: MARGIN + 140,
    y: y - 22,
    size: 8,
    font: fonts.regular,
    color: MUTED,
  });
  const kmBits = [
    input.dailyLimitKm != null ? `Daily KM ${input.dailyLimitKm}` : null,
    input.excessKmRateCents != null
      ? `Excess ${money(input.excessKmRateCents)}/km`
      : null,
    input.kmOut != null && input.kmIn != null ? `Odo ${input.kmOut}->${input.kmIn}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  if (kmBits) {
    page.drawText(kmBits, {
      x: MARGIN + 140,
      y: y - 36,
      size: 8,
      font: fonts.regular,
      color: MUTED,
    });
  }
  y -= 70;

  page.drawText("RETURN CHARGES", {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.bold,
    color: BRAND,
  });
  y -= 18;
  if (lines.returnLines.length === 0) {
    y = drawLineRow(page, fonts, "No additional return charges", money(0), y, { mute: true });
  } else {
    for (const line of lines.returnLines) {
      y = drawLineRow(page, fonts, line.label, money(line.amountCents), y);
    }
  }
  y = drawLineRow(
    page,
    fonts,
    "Return charges total",
    money(lines.returnChargesCents),
    y - 4,
    { bold: true }
  );

  y -= 18;
  page.drawRectangle({
    x: MARGIN,
    y: y - 58,
    width: CONTENT_W,
    height: 64,
    color: BRAND,
  });
  page.drawText("Grand total (booking + return charges)", {
    x: MARGIN + 14,
    y: y - 20,
    size: 9,
    font: fonts.regular,
    color: rgb(0.85, 0.9, 0.95),
  });
  page.drawText(money(lines.grandTotalCents), {
    x: PAGE_W - MARGIN - 90,
    y: y - 20,
    size: 11,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("AMOUNT DUE NOW", {
    x: MARGIN + 14,
    y: y - 42,
    size: 11,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(money(lines.amountDueCents), {
    x: PAGE_W - MARGIN - 90,
    y: y - 44,
    size: 16,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });

  y -= 80;
  const hash = createHash("sha256")
    .update(invoiceNumber + input.bookingId)
    .digest("hex")
    .slice(0, 16);
  page.drawText(
    `${siteConfig.address} · ${siteConfig.email} · ${siteConfig.phone}${
      siteConfig.abn ? ` · ABN ${siteConfig.abn}` : ""
    }`,
    {
      x: MARGIN,
      y,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
      maxWidth: CONTENT_W,
    }
  );
  page.drawText(`Ref ${hash} · Payment status: ${input.paymentStatus}`, {
    x: MARGIN,
    y: y - 12,
    size: 7.5,
    font: fonts.regular,
    color: MUTED,
  });

  const bytes = await pdf.save();
  const pdfUrl = await saveBinaryUpload(
    Buffer.from(bytes),
    "application/pdf",
    "agreements",
    "pdf"
  );
  return { pdfUrl, invoiceNumber };
}
