import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { format } from "date-fns";
import { createHash, randomBytes } from "crypto";
import QRCode from "qrcode";
import {
  getRentalBrand,
  resolveBookingRentalChannel,
  type RentalBrandConfig,
  type RentalChannel,
} from "@/lib/rentals/rental-brand";
import { readUploadBytes, saveBinaryUpload } from "@/lib/uploads/rental-file-storage";
import { getAppBaseUrl } from "@/lib/stripe";

export const AGREEMENT_PDF_VERSION = "2.3";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Keep body content above the QR/footer band */
const FOOTER_SAFE_Y = 58;
const INK = rgb(0.08, 0.1, 0.14);
const MUTED = rgb(0.35, 0.38, 0.42);
const LINE = rgb(0.82, 0.85, 0.88);
const CARD_BG = rgb(0.97, 0.98, 0.99);
const WHITE = rgb(1, 1, 1);

type PdfPalette = {
  primary: ReturnType<typeof rgb>;
  accent: ReturnType<typeof rgb>;
  primaryLight: ReturnType<typeof rgb>;
  totalBg: ReturnType<typeof rgb>;
  sectionBg: ReturnType<typeof rgb>;
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function buildPdfPalette(brand: RentalBrandConfig): PdfPalette {
  return {
    primary: hexToRgb(brand.colors.primary),
    accent: hexToRgb(brand.colors.accent),
    primaryLight: hexToRgb(brand.colors.primaryLight),
    totalBg: hexToRgb(brand.colors.totalBg),
    sectionBg: hexToRgb(brand.colors.sectionBg),
  };
}

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
  rentalChannel?: RentalChannel | string | null;
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
  brand: RentalBrandConfig;
  palette: PdfPalette;
  emblem: PDFImage | null;
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

function buildAgreementNumber(bookingId: string, prefix: string): string {
  const stamp = format(new Date(), "yyyyMMdd");
  const short = bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() || "XXXXXX";
  const salt = randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${short}-${salt}`;
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
    let bytes = await readUploadBytes(url);
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

async function embedQrCode(pdf: PDFDocument, url: string, darkColor: string) {
  const dataUrl = await QRCode.toDataURL(url, {
    margin: 1,
    width: 180,
    errorCorrectionLevel: "M",
    color: { dark: darkColor, light: "#FFFFFF" },
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

function drawSectionHeading(page: PDFPage, theme: Theme, title: string, yTop: number): number {
  const h = 22;
  const yBottom = yTop - h;
  page.drawRectangle({
    x: MARGIN,
    y: yBottom,
    width: CONTENT_W,
    height: h,
    color: theme.palette.sectionBg,
  });
  page.drawText(title, {
    x: MARGIN + 12,
    y: yBottom + 7,
    size: 10,
    font: theme.fonts.bold,
    color: WHITE,
  });
  return yBottom - 10;
}

function drawLabeledValue(
  page: PDFPage,
  theme: Theme,
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
      color: theme.palette.primaryLight,
      borderColor: theme.palette.primary,
      borderWidth: 0.7,
    });
    page.drawText(options.icon, {
      x: x + 1.8,
      y: y + 0.8,
      size: 6,
      font: theme.fonts.bold,
      color: theme.palette.primary,
    });
  }
  const labelX = options?.icon ? x + 14 : x;
  page.drawText(label, {
    x: labelX,
    y,
    size: 8,
    font: theme.fonts.regular,
    color: MUTED,
  });
  const lines = wrapText(value || "—", theme.fonts.bold, 9, valueMaxWidth);
  let cursor = y;
  for (const line of lines) {
    page.drawText(line, {
      x: labelX + labelWidth,
      y: cursor,
      size: 9,
      font: options?.boldValue === false ? theme.fonts.regular : theme.fonts.bold,
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
  palette: PdfPalette,
  x: number,
  y: number,
  companyName: string,
  abn?: string
) {
  const w = 118;
  const h = 56;
  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    borderColor: palette.accent,
    borderWidth: 2,
    color: WHITE,
    opacity: 0.92,
  });
  page.drawRectangle({
    x: x + 3,
    y: y - h + 3,
    width: w - 6,
    height: h - 6,
    borderColor: palette.accent,
    borderWidth: 0.8,
  });
  const stampName = companyName.toUpperCase();
  page.drawText(stampName, {
    x: x + Math.max(8, (w - fonts.bold.widthOfTextAtSize(stampName, 7)) / 2),
    y: y - 16,
    size: 7,
    font: fonts.bold,
    color: palette.accent,
  });
  page.drawText("APPROVED", {
    x: x + 32,
    y: y - 30,
    size: 10,
    font: fonts.bold,
    color: palette.primary,
  });
  if (abn?.trim()) {
    page.drawText(`ABN ${abn.trim()}`, {
      x: x + 18,
      y: y - 43,
      size: 6.5,
      font: fonts.regular,
      color: palette.accent,
    });
  } else {
    page.drawText("OFFICIAL STAMP", {
      x: x + 28,
      y: y - 43,
      size: 6.5,
      font: fonts.regular,
      color: palette.accent,
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
  const website = theme.brand.website.replace(/^https?:\/\//, "");
  page.drawText(
    `${theme.brand.name} | ${website} | Page ${pageNumber} of ${theme.pageCount}`,
    {
      x: footerLeft,
      y,
      size: 7.5,
      font: theme.fonts.regular,
      color: MUTED,
    }
  );
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
  const { palette } = theme;

  const emblemSize = 58;
  const emblemTop = PAGE_H - MARGIN;
  const emblemY = emblemTop - emblemSize;
  const textX = MARGIN + emblemSize + 14;
  const companyName = input.companyName || theme.brand.name;

  if (theme.emblem) {
    page.drawImage(theme.emblem, {
      x: MARGIN,
      y: emblemY,
      width: emblemSize,
      height: emblemSize,
    });
  } else {
    page.drawRectangle({
      x: MARGIN,
      y: emblemY,
      width: emblemSize,
      height: emblemSize,
      color: palette.primaryLight,
      borderColor: palette.primary,
      borderWidth: 1.5,
    });
    page.drawText("NB", {
      x: MARGIN + 16,
      y: emblemY + emblemSize / 2 - 8,
      size: 24,
      font: theme.fonts.bold,
      color: palette.primary,
    });
  }

  page.drawText(companyName, {
    x: textX,
    y: emblemTop - 20,
    size: 22,
    font: theme.fonts.bold,
    color: palette.accent,
  });
  page.drawText("Rental Agreement", {
    x: textX,
    y: emblemTop - 36,
    size: 11,
    font: theme.fonts.regular,
    color: INK,
  });
  page.drawText(theme.brand.tagline, {
    x: textX,
    y: emblemTop - 50,
    size: 8,
    font: theme.fonts.regular,
    color: MUTED,
  });

  const badgeW = 148;
  const badgeH = 38;
  const badgeX = PAGE_W - MARGIN - badgeW;
  const badgeY = emblemTop - badgeH;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: palette.primary,
  });
  page.drawText("BOOKING REFERENCE", {
    x: badgeX + 10,
    y: badgeY + 22,
    size: 7,
    font: theme.fonts.bold,
    color: WHITE,
  });
  const ref = input.bookingId.slice(0, 14);
  page.drawText(ref, {
    x: badgeX + 10,
    y: badgeY + 9,
    size: 8,
    font: theme.fonts.regular,
    color: WHITE,
  });

  let y = emblemY - 12;
  const contact = [
    input.companyAddress || theme.brand.address,
    `${input.companyPhone}  ·  ${input.companyEmail}`,
    input.companyWebsite || theme.brand.website,
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
    thickness: 2,
    color: palette.primary,
  });

  y -= 14;
  page.drawText(`Rental Agreement · No. ${theme.agreementNumber}`, {
    x: MARGIN,
    y,
    size: 8,
    font: theme.fonts.bold,
    color: palette.accent,
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
  let y = drawSectionHeading(page, theme, "CUSTOMER DETAILS", yTop);
  const cardH = 78;
  const bottom = y - cardH;
  drawCard(page, MARGIN, bottom, CONTENT_W, cardH);
  y -= 14;
  y = drawLabeledValue(page, theme, "Name", input.customerName, MARGIN + 12, y, 48, 420, {
    icon: "N",
  });
  y -= 2;
  y = drawLabeledValue(page, theme, "Email", input.customerEmail, MARGIN + 12, y, 48, 420, {
    icon: "E",
  });
  y -= 2;
  y = drawLabeledValue(page, theme, "Phone", input.customerPhone, MARGIN + 12, y, 48, 420, {
    icon: "P",
  });
  y -= 2;
  y = drawLabeledValue(page, theme, "Address", input.customerAddress || "—", MARGIN + 12, y, 48, 420, {
    icon: "A",
  });
  return bottom - 12;
}

function drawDriverTable(page: PDFPage, theme: Theme, input: AgreementPdfInput, yTop: number): number {
  let y = drawSectionHeading(page, theme, "DRIVER DETAILS", yTop);
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
    color: theme.palette.sectionBg,
  });
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: colX[i],
      y: y - 12,
      size: 8,
      font: theme.fonts.bold,
      color: WHITE,
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
  let y = drawSectionHeading(page, theme, "VEHICLE DETAILS", yTop);
  const cardH = 86;
  const bottom = y - cardH;
  drawCard(page, MARGIN, bottom, CONTENT_W, cardH, theme.palette.totalBg);
  y -= 14;

  const left = MARGIN + 12;
  const mid = MARGIN + 280;
  y = drawLabeledValue(page, theme, "Vehicle", vehicleDisplayName(input.vehicle), left, y, 55, 180, {
    icon: "V",
  });
  const yRightStart = y + 11;
  drawLabeledValue(
    page,
    theme,
    "Rego",
    input.vehicle.registration || "—",
    mid,
    yRightStart,
    40,
    160,
    { icon: "R" }
  );

  y -= 2;
  y = drawLabeledValue(page, theme, "VIN", input.vehicle.vin || "—", left, y, 55, 180, {
    icon: "I",
  });
  drawLabeledValue(
    page,
    theme,
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
    theme,
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
    theme,
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
  let y = drawSectionHeading(page, theme, "RENTAL DETAILS", yTop);
  const cardH = 92;
  const bottom = y - cardH;
  drawCard(page, MARGIN, bottom, CONTENT_W, cardH);
  const left = MARGIN + 12;
  const mid = MARGIN + 280;
  const { palette } = theme;
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
    color: palette.primary,
  });
  page.drawText("Bond", { x: mid, y, size: 8, font: theme.fonts.regular, color: MUTED });
  page.drawText(money(input.bondCents), {
    x: mid + 70,
    y,
    size: 10,
    font: theme.fonts.bold,
    color: palette.primary,
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
  let y = drawSectionHeading(page, theme, "PAYMENT SUMMARY", yTop);
  const { palette } = theme;
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
    color: palette.totalBg,
    borderColor: palette.primary,
    borderWidth: 1,
  });
  page.drawText("GRAND TOTAL", {
    x: MARGIN + 18,
    y: bottom + 16,
    size: 10,
    font: theme.fonts.bold,
    color: palette.accent,
  });
  page.drawText(money(grand), {
    x: PAGE_W - MARGIN - 100,
    y: bottom + 15,
    size: 13,
    font: theme.fonts.bold,
    color: palette.primary,
  });

  return bottom - 12;
}

function drawTermsSummary(page: PDFPage, theme: Theme, yTop: number): number {
  let y = drawSectionHeading(page, theme, "TERMS SUMMARY", yTop);
  const { palette } = theme;
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
      color: palette.primary,
    });
    page.drawLine({
      start: { x: x + 4, y: yy },
      end: { x: x + 10, y: yy + 7 },
      thickness: 1.4,
      color: palette.primary,
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
  theme: Theme,
  input: AgreementPdfInput,
  yTop: number,
  generatedAt: Date
): Promise<number> {
  let y = drawSectionHeading(page, theme, "SIGNATURES", yTop);
  page.drawText("Customer signature", {
    x: MARGIN,
    y,
    size: 8,
    font: theme.fonts.bold,
    color: MUTED,
  });
  page.drawText("Admin signature", {
    x: MARGIN + 190,
    y,
    size: 8,
    font: theme.fonts.bold,
    color: MUTED,
  });
  page.drawText("Company stamp", {
    x: MARGIN + 380,
    y,
    size: 8,
    font: theme.fonts.bold,
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
      font: theme.fonts.regular,
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
      font: theme.fonts.regular,
      color: MUTED,
    });
  }

  drawCompanyStamp(
    page,
    theme.fonts,
    theme.palette,
    MARGIN + 380,
    y,
    input.companyName || theme.brand.name,
    input.companyAbn || theme.brand.abn
  );

  page.drawText(`Date: ${format(generatedAt, "dd MMM yyyy")}`, {
    x: MARGIN,
    y: sigBottom - 14,
    size: 8,
    font: theme.fonts.bold,
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

  const brand = getRentalBrand(resolveBookingRentalChannel({ rentalChannel: input.rentalChannel }));

  const emblem =
    (await tryEmbedImage(pdf, brand.logo.emblem)) ||
    (await tryEmbedImage(pdf, brand.logo.stacked)) ||
    (await tryEmbedImage(pdf, brand.logo.horizontal));
  const watermark =
    (await tryEmbedImage(pdf, brand.logo.stacked)) ||
    (await tryEmbedImage(pdf, brand.logo.emblem)) ||
    (await tryEmbedImage(pdf, brand.logo.horizontal));

  const baseUrl = getAppBaseUrl();
  const bookingUrl = `${baseUrl}/car-rental/booking/success?booking_id=${input.bookingId}`;
  const qr = await embedQrCode(pdf, bookingUrl, brand.qrColor);

  const agreementNumber = buildAgreementNumber(input.bookingId, brand.agreementPrefix);
  const generatedAt = new Date();
  const pageCount = 2;

  const theme: Theme = {
    fonts,
    brand,
    palette: buildPdfPalette(brand),
    emblem,
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
  y = drawSectionHeading(page2, theme, "TERMS & CONDITIONS", y);

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
      body: `Stop safely, prioritise safety, contact emergency services if needed, exchange details, photograph the scene, and notify ${input.companyName} immediately. Do not admit liability.`,
    },
    {
      title: "7. Vehicle Return",
      body: "Return on time to the agreed location with keys, accessories, documents, and fuel level matching pickup. Late returns may incur hourly fees and delay subsequent bookings.",
    },
    {
      title: "8. Cancellation Policy",
      body: `Cancellations are subject to ${input.companyName} policy for prepaid and walk-in bookings. No-shows and late cancellations may forfeit deposits or attract administration fees.`,
    },
    {
      title: "9. Privacy Policy",
      body: `Personal information is collected to fulfil the rental and is handled under Australian Privacy Principles and the ${input.companyName} Privacy Policy available at ${theme.brand.website}.`,
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
      color: theme.palette.accent,
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
  y = await drawSignatureBlock(page2, pdf, theme, input, signatureTop, generatedAt);

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
