import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { format } from "date-fns";
import { promises as fs } from "fs";
import { createHash, randomBytes } from "crypto";
import QRCode from "qrcode";
import { siteConfig } from "@/data/services";
import { publicUrlToAbsolutePath, saveBinaryUpload } from "@/lib/uploads/rental-file-storage";

export const AGREEMENT_PDF_VERSION = "2.0";

function resolveAppBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];
  for (const value of candidates) {
    if (!value?.trim()) continue;
    const normalized = value.trim().replace(/\/$/, "");
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
    return `https://${normalized}`;
  }
  return siteConfig.websiteUrl || "https://www.everestcarrental.com";
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Keep body content above the QR/footer band */
const FOOTER_SAFE_Y = 58;
const BRAND = rgb(0.039, 0.302, 0.549); // #0A4D8C
const BRAND_LIGHT = rgb(0.9, 0.94, 0.97);
const INK = rgb(0.08, 0.1, 0.14);
const MUTED = rgb(0.35, 0.38, 0.42);
const LINE = rgb(0.82, 0.85, 0.88);
const CARD_BG = rgb(0.97, 0.98, 0.99);
const HEADING_BG = rgb(0.93, 0.95, 0.97);
const TOTAL_BG = rgb(0.92, 0.96, 1);
const WHITE = rgb(1, 1, 1);
const STAMP_BLUE = rgb(0.05, 0.28, 0.55);

export type AgreementPdfDriver = {
  isPrimary: boolean;
  firstName: string;
  lastName: string;
  phone?: string | null;
  licenceNumber?: string | null;
  licenceExpiry?: Date | null;
  signatureUrl?: string | null;
};

export type AgreementPdfInput = {
  bookingId: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress?: string;
  companyWebsite?: string;
  companyAbn?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  drivers: AgreementPdfDriver[];
  vehicle: {
    title?: string | null;
    year?: number | null;
    make: string;
    model: string;
    registration?: string | null;
    vin?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
    colour?: string | null;
  };
  pickupAt: Date;
  dropoffAt: Date;
  kmOut?: number | null;
  expectedKmIn?: number | null;
  fuelOut?: string | null;
  rentalDays?: number | null;
  dailyRateCents?: number | null;
  dailyLimitKm?: number | null;
  bondCents?: number | null;
  insuranceNotes?: string | null;
  insuranceCostCents?: number | null;
  discountCents?: number | null;
  taxAmountCents?: number | null;
  totalAmountCents?: number | null;
  adminSignatureUrl?: string | null;
};

type Fonts = { regular: PDFFont; bold: PDFFont };

type Theme = {
  fonts: Fonts;
  logo: PDFImage | null;
  watermark: PDFImage | null;
  qr: PDFImage | null;
  agreementNumber: string;
  generatedAt: Date;
  pageCount: number;
};

function money(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function vehicleDisplayName(vehicle: AgreementPdfInput["vehicle"]): string {
  const title = vehicle.title?.trim();
  if (title) return title;
  return `${vehicle.year ?? ""} ${vehicle.make} ${vehicle.model}`.replace(/\s+/g, " ").trim();
}

function buildAgreementNumber(bookingId: string): string {
  const stamp = format(new Date(), "yyyyMMdd");
  const short = bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "XXXXXX";
  const salt = randomBytes(2).toString("hex").toUpperCase();
  return `ECR-${stamp}-${short}-${salt}`;
}

function sniffImageKind(bytes: Buffer): "png" | "jpg" | "other" {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  return "other";
}

async function tryEmbedImage(pdf: PDFDocument, url: string | null | undefined) {
  if (!url) return null;
  try {
    const abs = publicUrlToAbsolutePath(url);
    let bytes = Buffer.from(await fs.readFile(abs));
    let kind = sniffImageKind(bytes);

    // pdf-lib only embeds PNG/JPEG. Convert SVG/WebP/etc (office typed sigs are SVG).
    if (kind === "other") {
      const sharp = (await import("sharp")).default;
      bytes = Buffer.from(await sharp(bytes).png().toBuffer());
      kind = "png";
    }

    if (kind === "jpg") return pdf.embedJpg(bytes);
    return pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

async function embedQrCode(pdf: PDFDocument, url: string) {
  const dataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 180,
    errorCorrectionLevel: "M",
    color: { dark: "#0A4D8C", light: "#FFFFFF" },
  });
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return pdf.embedPng(Buffer.from(base64, "base64"));
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

function drawCard(
  page: PDFPage,
  x: number,
  yBottom: number,
  width: number,
  height: number,
  fill = CARD_BG
) {
  page.drawRectangle({
    x,
    y: yBottom,
    width,
    height,
    color: fill,
    borderColor: LINE,
    borderWidth: 1,
  });
}

function drawSectionHeading(page: PDFPage, fonts: Fonts, title: string, yTop: number): number {
  const h = 22;
  const yBottom = yTop - h;
  page.drawRectangle({
    x: MARGIN,
    y: yBottom,
    width: CONTENT_W,
    height: h,
    color: HEADING_BG,
    borderColor: LINE,
    borderWidth: 0.5,
  });
  page.drawRectangle({
    x: MARGIN,
    y: yBottom,
    width: 4,
    height: h,
    color: BRAND,
  });
  page.drawText(title, {
    x: MARGIN + 12,
    y: yBottom + 7,
    size: 10,
    font: fonts.bold,
    color: BRAND,
  });
  return yBottom - 10;
}

function drawLabeledValue(
  page: PDFPage,
  fonts: Fonts,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth: number,
  valueMaxWidth: number,
  options?: { boldValue?: boolean; icon?: string }
): number {
  if (options?.icon) {
    page.drawCircle({
      x: x + 4,
      y: y + 3,
      size: 5.5,
      color: BRAND_LIGHT,
      borderColor: BRAND,
      borderWidth: 0.7,
    });
    page.drawText(options.icon, {
      x: x + 1.8,
      y: y + 0.8,
      size: 6,
      font: fonts.bold,
      color: BRAND,
    });
  }
  const labelX = options?.icon ? x + 14 : x;
  page.drawText(label, {
    x: labelX,
    y,
    size: 8,
    font: fonts.regular,
    color: MUTED,
  });
  const lines = wrapText(value || "—", fonts.bold, 9, valueMaxWidth);
  let cursor = y;
  for (const line of lines) {
    page.drawText(line, {
      x: labelX + labelWidth,
      y: cursor,
      size: 9,
      font: options?.boldValue === false ? fonts.regular : fonts.bold,
      color: INK,
    });
    cursor -= 11;
  }
  return cursor;
}

function drawWatermark(page: PDFPage, watermark: PDFImage | null) {
  if (!watermark) return;
  const size = 260;
  const dims = watermark.scale(1);
  const scale = Math.min(size / dims.width, size / dims.height);
  const w = dims.width * scale;
  const h = dims.height * scale;
  page.drawImage(watermark, {
    x: (PAGE_W - w) / 2,
    y: (PAGE_H - h) / 2,
    width: w,
    height: h,
    opacity: 0.05,
  });
}

function drawCompanyStamp(
  page: PDFPage,
  fonts: Fonts,
  x: number,
  y: number,
  abn?: string
) {
  const w = 118;
  const h = 56;
  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    borderColor: STAMP_BLUE,
    borderWidth: 2,
    color: WHITE,
    opacity: 0.92,
  });
  page.drawRectangle({
    x: x + 3,
    y: y - h + 3,
    width: w - 6,
    height: h - 6,
    borderColor: STAMP_BLUE,
    borderWidth: 0.8,
  });
  page.drawText("EVEREST CAR RENTAL", {
    x: x + 10,
    y: y - 16,
    size: 7,
    font: fonts.bold,
    color: STAMP_BLUE,
  });
  page.drawText("APPROVED", {
    x: x + 32,
    y: y - 30,
    size: 10,
    font: fonts.bold,
    color: STAMP_BLUE,
  });
  if (abn?.trim()) {
    page.drawText(`ABN ${abn.trim()}`, {
      x: x + 18,
      y: y - 43,
      size: 6.5,
      font: fonts.regular,
      color: STAMP_BLUE,
    });
  } else {
    page.drawText("OFFICIAL STAMP", {
      x: x + 28,
      y: y - 43,
      size: 6.5,
      font: fonts.regular,
      color: STAMP_BLUE,
    });
  }
}

function drawFooter(
  page: PDFPage,
  theme: Theme,
  pageNumber: number
) {
  const y = 28;
  page.drawLine({
    start: { x: MARGIN, y: 48 },
    end: { x: PAGE_W - MARGIN, y: 48 },
    thickness: 0.6,
    color: LINE,
  });

  if (theme.qr) {
    page.drawImage(theme.qr, {
      x: MARGIN,
      y: 8,
      width: 34,
      height: 34,
    });
  }

  const footerLeft = theme.qr ? MARGIN + 42 : MARGIN;
  const website = siteConfig.website || "www.everestcarrental.com";
  page.drawText(`Everest Car Rental | ${website} | Page ${pageNumber} of ${theme.pageCount}`, {
    x: footerLeft,
    y,
    size: 7.5,
    font: theme.fonts.regular,
    color: MUTED,
  });
  page.drawText(
    `${theme.agreementNumber} · v${AGREEMENT_PDF_VERSION} · ${format(theme.generatedAt, "dd MMM yyyy HH:mm")}`,
    {
      x: footerLeft,
      y: y - 10,
      size: 6.5,
      font: theme.fonts.regular,
      color: MUTED,
    }
  );
}

function drawHeader(page: PDFPage, theme: Theme, input: AgreementPdfInput): number {
  drawWatermark(page, theme.watermark);

  const badgeW = 148;
  const badgeH = 34;
  const badgeX = PAGE_W - MARGIN - badgeW;
  const badgeY = PAGE_H - MARGIN - badgeH;
  const logoMaxW = badgeX - MARGIN - 16;

  if (theme.logo) {
    const dims = theme.logo.scale(1);
    const targetH = 30;
    const scale = Math.min(targetH / dims.height, logoMaxW / dims.width);
    const w = dims.width * scale;
    const h = dims.height * scale;
    page.drawImage(theme.logo, {
      x: MARGIN,
      y: PAGE_H - MARGIN - h,
      width: w,
      height: h,
    });
  } else {
    page.drawText("EVEREST CAR RENTAL", {
      x: MARGIN,
      y: PAGE_H - MARGIN - 12,
      size: 14,
      font: theme.fonts.bold,
      color: BRAND,
    });
    page.drawText("Rental Agreement", {
      x: MARGIN,
      y: PAGE_H - MARGIN - 28,
      size: 11,
      font: theme.fonts.regular,
      color: INK,
    });
  }

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: BRAND,
  });
  page.drawText("BOOKING REFERENCE", {
    x: badgeX + 10,
    y: badgeY + 20,
    size: 7,
    font: theme.fonts.bold,
    color: WHITE,
  });
  const ref = input.bookingId.slice(0, 14);
  page.drawText(ref, {
    x: badgeX + 10,
    y: badgeY + 8,
    size: 8,
    font: theme.fonts.regular,
    color: WHITE,
  });

  let y = PAGE_H - MARGIN - 48;
  const contact = [
    input.companyAddress || siteConfig.address,
    `${input.companyPhone}  ·  ${input.companyEmail}`,
    input.companyWebsite || siteConfig.website,
  ]
    .filter(Boolean)
    .join("  |  ");
  page.drawText(contact, {
    x: MARGIN,
    y,
    size: 7.5,
    font: theme.fonts.regular,
    color: MUTED,
    maxWidth: CONTENT_W,
  });

  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1.2,
    color: BRAND,
  });

  y -= 14;
  page.drawText(`Rental Agreement · No. ${theme.agreementNumber}`, {
    x: MARGIN,
    y,
    size: 8,
    font: theme.fonts.bold,
    color: INK,
  });
  page.drawText(
    `Generated ${format(theme.generatedAt, "dd MMM yyyy, h:mm a")}  ·  Version ${AGREEMENT_PDF_VERSION}`,
    {
      x: MARGIN + 270,
      y,
      size: 7.5,
      font: theme.fonts.regular,
      color: MUTED,
    }
  );

  return y - 16;
}

function drawCustomerCard(page: PDFPage, theme: Theme, input: AgreementPdfInput, yTop: number): number {
  let y = drawSectionHeading(page, theme.fonts, "CUSTOMER DETAILS", yTop);
  const cardH = 78;
  const bottom = y - cardH;
  drawCard(page, MARGIN, bottom, CONTENT_W, cardH);
  y -= 14;
  y = drawLabeledValue(page, theme.fonts, "Name", input.customerName, MARGIN + 12, y, 48, 420, {
    icon: "N",
  });
  y -= 2;
  y = drawLabeledValue(page, theme.fonts, "Email", input.customerEmail, MARGIN + 12, y, 48, 420, {
    icon: "E",
  });
  y -= 2;
  y = drawLabeledValue(page, theme.fonts, "Phone", input.customerPhone, MARGIN + 12, y, 48, 420, {
    icon: "P",
  });
  y -= 2;
  y = drawLabeledValue(page, theme.fonts, "Address", input.customerAddress || "—", MARGIN + 12, y, 48, 420, {
    icon: "A",
  });
  return bottom - 12;
}

function drawDriverTable(page: PDFPage, theme: Theme, input: AgreementPdfInput, yTop: number): number {
  let y = drawSectionHeading(page, theme.fonts, "DRIVER DETAILS", yTop);
  const rows = input.drivers.length ? input.drivers : [
    {
      isPrimary: true,
      firstName: input.customerName.split(" ")[0] || "Customer",
      lastName: input.customerName.split(" ").slice(1).join(" "),
      licenceNumber: null,
      licenceExpiry: null,
    },
  ];

  const colX = [MARGIN + 8, MARGIN + 190, MARGIN + 330, MARGIN + 430];
  const headers = ["Driver", "Role", "Licence Number", "Expiry"];
  page.drawRectangle({
    x: MARGIN,
    y: y - 18,
    width: CONTENT_W,
    height: 18,
    color: HEADING_BG,
    borderColor: LINE,
    borderWidth: 0.5,
  });
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: colX[i],
      y: y - 12,
      size: 8,
      font: theme.fonts.bold,
      color: MUTED,
    });
  });
  y -= 18;

  for (const driver of rows.slice(0, 4)) {
    const name = `${driver.firstName} ${driver.lastName}`.trim();
    const role = driver.isPrimary ? "Primary" : "Additional";
    const licence = driver.licenceNumber || "—";
    const expiry = driver.licenceExpiry ? format(driver.licenceExpiry, "dd MMM yyyy") : "—";
    page.drawRectangle({
      x: MARGIN,
      y: y - 18,
      width: CONTENT_W,
      height: 18,
      borderColor: LINE,
      borderWidth: 0.4,
      color: WHITE,
    });
    page.drawText(name.slice(0, 28), { x: colX[0], y: y - 12, size: 8, font: theme.fonts.regular, color: INK });
    page.drawText(role, { x: colX[1], y: y - 12, size: 8, font: theme.fonts.regular, color: INK });
    page.drawText(licence.slice(0, 18), { x: colX[2], y: y - 12, size: 8, font: theme.fonts.bold, color: INK });
    page.drawText(expiry, { x: colX[3], y: y - 12, size: 8, font: theme.fonts.regular, color: INK });
    y -= 18;
  }

  return y - 12;
}

function drawVehicleCard(page: PDFPage, theme: Theme, input: AgreementPdfInput, yTop: number): number {
  let y = drawSectionHeading(page, theme.fonts, "VEHICLE DETAILS", yTop);
  const cardH = 86;
  const bottom = y - cardH;
  drawCard(page, MARGIN, bottom, CONTENT_W, cardH, TOTAL_BG);
  y -= 14;

  const left = MARGIN + 12;
  const mid = MARGIN + 280;
  y = drawLabeledValue(page, theme.fonts, "Vehicle", vehicleDisplayName(input.vehicle), left, y, 55, 180, {
    icon: "V",
  });
  const yRightStart = y + 11;
  drawLabeledValue(
    page,
    theme.fonts,
    "Rego",
    input.vehicle.registration || "—",
    mid,
    yRightStart,
    40,
    160,
    { icon: "R" }
  );

  y -= 2;
  y = drawLabeledValue(page, theme.fonts, "VIN", input.vehicle.vin || "—", left, y, 55, 180, {
    icon: "I",
  });
  drawLabeledValue(
    page,
    theme.fonts,
    "Fuel",
    input.vehicle.fuelType || "—",
    mid,
    y + 11,
    40,
    160,
    { icon: "F" }
  );

  y -= 2;
  y = drawLabeledValue(
    page,
    theme.fonts,
    "Trans.",
    input.vehicle.transmission || "—",
    left,
    y,
    55,
    180,
    { icon: "T" }
  );
  drawLabeledValue(
    page,
    theme.fonts,
    "Colour",
    input.vehicle.colour || "—",
    mid,
    y + 11,
    40,
    160,
    { icon: "C" }
  );

  return bottom - 12;
}

function drawRentalDetails(page: PDFPage, theme: Theme, input: AgreementPdfInput, yTop: number): number {
  let y = drawSectionHeading(page, theme.fonts, "RENTAL DETAILS", yTop);
  const cardH = 92;
  const bottom = y - cardH;
  drawCard(page, MARGIN, bottom, CONTENT_W, cardH);
  const left = MARGIN + 12;
  const mid = MARGIN + 280;
  y -= 14;

  page.drawText("Pickup date", { x: left, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(format(input.pickupAt, "dd MMM yyyy"), {
    x: left + 70,
    y,
    size: 9,
    font: theme.fonts.bold,
    color: INK,
  });
  page.drawText("Return date", { x: mid, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(format(input.dropoffAt, "dd MMM yyyy"), {
    x: mid + 70,
    y,
    size: 9,
    font: theme.fonts.bold,
    color: INK,
  });
  y -= 14;

  page.drawText("Pickup time", { x: left, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(format(input.pickupAt, "h:mm a"), {
    x: left + 70,
    y,
    size: 9,
    font: theme.fonts.bold,
    color: INK,
  });
  page.drawText("Return time", { x: mid, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(format(input.dropoffAt, "h:mm a"), {
    x: mid + 70,
    y,
    size: 9,
    font: theme.fonts.bold,
    color: INK,
  });
  y -= 16;

  page.drawText("Daily rate", { x: left, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(money(input.dailyRateCents), {
    x: left + 70,
    y,
    size: 10,
    font: theme.fonts.bold,
    color: BRAND,
  });
  page.drawText("Bond", { x: mid, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(money(input.bondCents), {
    x: mid + 70,
    y,
    size: 10,
    font: theme.fonts.bold,
    color: BRAND,
  });
  y -= 14;

  page.drawText("Insurance", { x: left, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText((input.insuranceNotes || "As selected at booking").slice(0, 42), {
    x: left + 70,
    y,
    size: 8,
    font: theme.fonts.bold,
    color: INK,
  });
  page.drawText("Daily KM", { x: mid, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(String(input.dailyLimitKm ?? "—"), {
    x: mid + 70,
    y,
    size: 9,
    font: theme.fonts.bold,
    color: INK,
  });
  y -= 14;

  page.drawText("KM out", { x: left, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(input.kmOut != null ? String(input.kmOut) : "—", {
    x: left + 70,
    y,
    size: 9,
    font: theme.fonts.bold,
    color: INK,
  });
  page.drawText("Expected KM", { x: mid, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(input.expectedKmIn != null ? String(input.expectedKmIn) : "—", {
    x: mid + 70,
    y,
    size: 9,
    font: theme.fonts.bold,
    color: INK,
  });

  return bottom - 12;
}

function drawPaymentSummary(page: PDFPage, theme: Theme, input: AgreementPdfInput, yTop: number): number {
  let y = drawSectionHeading(page, theme.fonts, "PAYMENT SUMMARY", yTop);
  const days = Math.max(1, input.rentalDays ?? 1);
  const daily = input.dailyRateCents ?? 0;
  const insurance = input.insuranceCostCents ?? 0;
  const discount = input.discountCents ?? 0;
  const bond = input.bondCents ?? 0;
  const gst = input.taxAmountCents ?? 0;
  const rentalSubtotal = daily * days;
  const grand =
    input.totalAmountCents ??
    Math.max(0, rentalSubtotal + insurance + gst - discount);

  const rows: Array<[string, string, boolean?]> = [
    ["Daily rate", money(daily)],
    ["Rental days", String(days)],
    ["Rental subtotal", money(rentalSubtotal)],
    ["Bond (security)", money(bond)],
    ["Insurance cost", money(insurance)],
    ["Discount", money(discount)],
    ["GST", money(gst)],
  ];

  const boxH = 20 + rows.length * 16 + 34;
  const bottom = y - boxH;
  drawCard(page, MARGIN, bottom, CONTENT_W, boxH, WHITE);
  y -= 14;

  for (const [label, value] of rows) {
    page.drawText(label, { x: MARGIN + 14, y, size: 8.5, font: theme.fonts.regular, color: MUTED });
    page.drawText(value, {
      x: PAGE_W - MARGIN - 90,
      y,
      size: 9,
      font: theme.fonts.bold,
      color: INK,
    });
    y -= 16;
  }

  page.drawRectangle({
    x: MARGIN + 8,
    y: bottom + 8,
    width: CONTENT_W - 16,
    height: 26,
    color: TOTAL_BG,
    borderColor: BRAND,
    borderWidth: 1,
  });
  page.drawText("GRAND TOTAL", {
    x: MARGIN + 18,
    y: bottom + 16,
    size: 10,
    font: theme.fonts.bold,
    color: BRAND,
  });
  page.drawText(money(grand), {
    x: PAGE_W - MARGIN - 100,
    y: bottom + 15,
    size: 13,
    font: theme.fonts.bold,
    color: BRAND,
  });

  return bottom - 12;
}

function drawTermsSummary(page: PDFPage, theme: Theme, yTop: number): number {
  let y = drawSectionHeading(page, theme.fonts, "TERMS SUMMARY", yTop);
  const items = [
    "Fuel Policy",
    "Damage Policy",
    "Late Return",
    "Insurance",
    "Excess KM",
    "Driver Responsibilities",
  ];
  const colW = CONTENT_W / 2;
  items.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + col * colW;
    const yy = y - row * 14;
    // Standard Helvetica is WinAnsi-only — draw a check instead of Unicode ✓
    page.drawLine({
      start: { x: x + 1, y: yy + 3 },
      end: { x: x + 4, y: yy },
      thickness: 1.4,
      color: BRAND,
    });
    page.drawLine({
      start: { x: x + 4, y: yy },
      end: { x: x + 10, y: yy + 7 },
      thickness: 1.4,
      color: BRAND,
    });
    page.drawText(item, {
      x: x + 14,
      y: yy,
      size: 9,
      font: theme.fonts.regular,
      color: INK,
    });
  });
  return y - 52;
}

async function drawSignatureBlock(
  page: PDFPage,
  pdf: PDFDocument,
  fonts: Fonts,
  input: AgreementPdfInput,
  yTop: number,
  generatedAt: Date
): Promise<number> {
  let y = drawSectionHeading(page, fonts, "SIGNATURES", yTop);
  page.drawText("Customer signature", {
    x: MARGIN,
    y,
    size: 8,
    font: fonts.bold,
    color: MUTED,
  });
  page.drawText("Admin signature", {
    x: MARGIN + 190,
    y,
    size: 8,
    font: fonts.bold,
    color: MUTED,
  });
  page.drawText("Company stamp", {
    x: MARGIN + 380,
    y,
    size: 8,
    font: fonts.bold,
    color: MUTED,
  });
  y -= 6;

  const primary = input.drivers.find((d) => d.isPrimary) ?? input.drivers[0];
  const customerSig = await tryEmbedImage(pdf, primary?.signatureUrl);
  const adminSig = await tryEmbedImage(pdf, input.adminSignatureUrl);

  const sigBottom = y - 52;
  page.drawRectangle({
    x: MARGIN,
    y: sigBottom,
    width: 160,
    height: 50,
    borderColor: LINE,
    borderWidth: 0.8,
    color: WHITE,
  });
  page.drawRectangle({
    x: MARGIN + 190,
    y: sigBottom,
    width: 160,
    height: 50,
    borderColor: LINE,
    borderWidth: 0.8,
    color: WHITE,
  });

  if (customerSig) {
    page.drawImage(customerSig, { x: MARGIN + 8, y: sigBottom + 4, width: 144, height: 42 });
  } else {
    page.drawText("(signed electronically)", {
      x: MARGIN + 18,
      y: sigBottom + 20,
      size: 8,
      font: fonts.regular,
      color: MUTED,
    });
  }

  if (adminSig) {
    page.drawImage(adminSig, { x: MARGIN + 198, y: sigBottom + 4, width: 144, height: 42 });
  } else {
    page.drawText("(signed at pickup)", {
      x: MARGIN + 214,
      y: sigBottom + 20,
      size: 8,
      font: fonts.regular,
      color: MUTED,
    });
  }

  drawCompanyStamp(
    page,
    fonts,
    MARGIN + 380,
    y,
    input.companyAbn || siteConfig.abn
  );

  page.drawText(`Date: ${format(generatedAt, "dd MMM yyyy")}`, {
    x: MARGIN,
    y: sigBottom - 14,
    size: 8,
    font: fonts.bold,
    color: INK,
  });

  return sigBottom - 28;
}

/** Full production rental agreement PDF (A4, 2 pages). */
export async function generateRentalAgreementPdf(input: AgreementPdfInput): Promise<string> {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const logo =
    (await tryEmbedImage(pdf, siteConfig.logo.horizontal)) ||
    (await tryEmbedImage(pdf, siteConfig.logo.stacked));
  const watermark =
    (await tryEmbedImage(pdf, siteConfig.logo.stacked)) ||
    (await tryEmbedImage(pdf, siteConfig.logo.horizontal));

  const baseUrl = resolveAppBaseUrl();
  const bookingUrl = `${baseUrl}/car-rental/booking/success?booking_id=${input.bookingId}`;
  const qr = await embedQrCode(pdf, bookingUrl);

  const agreementNumber = buildAgreementNumber(input.bookingId);
  const generatedAt = new Date();
  const pageCount = 2;

  const theme: Theme = {
    fonts,
    logo,
    watermark,
    qr,
    agreementNumber,
    generatedAt,
    pageCount,
  };

  // ——— PAGE 1 ———
  const page1 = pdf.addPage([PAGE_W, PAGE_H]);
  let y = drawHeader(page1, theme, input);
  y = drawCustomerCard(page1, theme, input, y);
  y = drawDriverTable(page1, theme, input, y);
  y = drawVehicleCard(page1, theme, input, y);
  y = drawRentalDetails(page1, theme, input, y);
  y = drawPaymentSummary(page1, theme, input, y);
  // Terms summary only if it fits above the footer (full T&Cs are on page 2)
  if (y > FOOTER_SAFE_Y + 72) {
    y = drawTermsSummary(page1, theme, y);
  }
  drawFooter(page1, theme, 1);

  // ——— PAGE 2 (T&Cs, then signatures last) ———
  const page2 = pdf.addPage([PAGE_W, PAGE_H]);
  y = drawHeader(page2, theme, input);
  y = drawSectionHeading(page2, fonts, "TERMS & CONDITIONS", y);

  const terms: Array<{ title: string; body: string }> = [
    {
      title: "1. Customer Responsibilities",
      body: "The hirer must hold a valid licence for the vehicle class, obey all road rules, and use the vehicle only for lawful personal or business travel. Smoking, unauthorized drivers, racing, and off-road use (unless approved) are prohibited.",
    },
    {
      title: "2. Fuel Policy",
      body: "The vehicle must be returned with the same fuel level recorded at pickup. A refuelling fee and fuel cost will apply if returned with less fuel.",
    },
    {
      title: "3. Vehicle Care",
      body: "Keep the vehicle clean and secure. Report warning lights, mechanical issues, or unusual performance immediately. Do not modify the vehicle or tow unless expressly authorised.",
    },
    {
      title: "4. Insurance",
      body: "Cover is provided according to the protection option selected at booking. Excess amounts, exclusions, and conditions form part of this agreement. Optional cover reduces but may not eliminate excess liability.",
    },
    {
      title: "5. Damage",
      body: "The hirer is liable for damage, loss, theft, and related costs except to the extent limited by the selected insurance. All new damage must be reported at return with supporting photographs where possible.",
    },
    {
      title: "6. Accident Procedure",
      body: "Stop safely, prioritise safety, contact emergency services if needed, exchange details, photograph the scene, and notify Everest Car Rental immediately. Do not admit liability.",
    },
    {
      title: "7. Vehicle Return",
      body: "Return on time to the agreed location with keys, accessories, documents, and fuel level matching pickup. Late returns may incur hourly fees and delay subsequent bookings.",
    },
    {
      title: "8. Cancellation Policy",
      body: "Cancellations are subject to Everest Car Rental policy for prepaid and walk-in bookings. No-shows and late cancellations may forfeit deposits or attract administration fees.",
    },
    {
      title: "9. Privacy Policy",
      body: "Personal information is collected to fulfil the rental and is handled under Australian Privacy Principles and the Everest Car Rental Privacy Policy available at www.everestcarrental.com.",
    },
    {
      title: "10. Declaration",
      body: "By signing, the hirer confirms that all licence and personal details are accurate, they are authorised to drive, they have read these terms, and they accept full responsibility under this agreement.",
    },
  ];

  // Leave room for the signature block + footer at the end of page 2
  const signatureReserve = 150;
  for (const section of terms) {
    if (y < FOOTER_SAFE_Y + signatureReserve) break;
    page2.drawText(section.title, {
      x: MARGIN,
      y,
      size: 10,
      font: fonts.bold,
      color: BRAND,
    });
    y -= 12;
    const lines = wrapText(section.body, fonts.regular, 8.5, CONTENT_W);
    for (const line of lines) {
      if (y < FOOTER_SAFE_Y + signatureReserve) break;
      page2.drawText(line, {
        x: MARGIN,
        y,
        size: 8.5,
        font: fonts.regular,
        color: INK,
      });
      y -= 11;
    }
    y -= 8;
  }

  // Place signatures above the footer on the last page
  const signatureTop = Math.min(y - 6, FOOTER_SAFE_Y + signatureReserve);
  y = await drawSignatureBlock(page2, pdf, fonts, input, signatureTop, generatedAt);

  if (y > FOOTER_SAFE_Y + 8) {
    page2.drawText(
      `Document hash ref: ${createHash("sha256").update(agreementNumber + input.bookingId).digest("hex").slice(0, 16)}`,
      {
        x: MARGIN,
        y,
        size: 7,
        font: fonts.regular,
        color: MUTED,
      }
    );
  }

  drawFooter(page2, theme, 2);

  const bytes = await pdf.save();
  return saveBinaryUpload(Buffer.from(bytes), "application/pdf", "agreements", "pdf");
}
