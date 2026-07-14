import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { promises as fs } from "fs";
import { publicUrlToAbsolutePath, saveBinaryUpload } from "@/lib/uploads/rental-file-storage";

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
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  drivers: AgreementPdfDriver[];
  vehicle: {
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
  dailyRateCents?: number | null;
  dailyLimitKm?: number | null;
  bondCents?: number | null;
  insuranceNotes?: string | null;
  adminSignatureUrl?: string | null;
};

function money(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

async function tryEmbedPng(pdf: PDFDocument, url: string | null | undefined) {
  if (!url) return null;
  try {
    const abs = publicUrlToAbsolutePath(url);
    const bytes = await fs.readFile(abs);
    if (url.toLowerCase().endsWith(".jpg") || url.toLowerCase().endsWith(".jpeg")) {
      return pdf.embedJpg(bytes);
    }
    return pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function generateRentalAgreementPdf(input: AgreementPdfInput): Promise<string> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page1 = pdf.addPage([595, 842]);
  const page2 = pdf.addPage([595, 842]);
  const black = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.35, 0.35, 0.35);

  let y = 800;
  const left = 40;
  const width = 515;

  const write = (
    page: typeof page1,
    text: string,
    size = 10,
    options?: { bold?: boolean; color?: typeof black; x?: number }
  ) => {
    page.drawText(text, {
      x: options?.x ?? left,
      y,
      size,
      font: options?.bold ? bold : font,
      color: options?.color ?? black,
      maxWidth: width,
    });
    y -= size + 6;
  };

  write(page1, input.companyName.toUpperCase(), 16, { bold: true });
  write(page1, "RENTAL AGREEMENT", 13, { bold: true });
  write(page1, `${input.companyEmail}  ·  ${input.companyPhone}`, 9, { color: muted });
  write(page1, `Booking reference: ${input.bookingId}`, 9, { color: muted });
  y -= 8;

  write(page1, "1. Customer details", 11, { bold: true });
  write(page1, `Name: ${input.customerName}`);
  write(page1, `Email: ${input.customerEmail}`);
  write(page1, `Phone: ${input.customerPhone}`);
  write(page1, `Address: ${input.customerAddress || "—"}`);
  y -= 4;

  write(page1, "2. Drivers", 11, { bold: true });
  for (const driver of input.drivers) {
    const label = driver.isPrimary ? "Primary" : "Additional";
    write(
      page1,
      `${label}: ${driver.firstName} ${driver.lastName}  |  Licence: ${driver.licenceNumber ?? "—"}  |  Expiry: ${
        driver.licenceExpiry ? format(driver.licenceExpiry, "dd MMM yyyy") : "—"
      }`
    );
  }
  y -= 4;

  write(page1, "3. Vehicle details", 11, { bold: true });
  write(
    page1,
    `${input.vehicle.year ?? ""} ${input.vehicle.make} ${input.vehicle.model}`.trim()
  );
  write(page1, `Rego: ${input.vehicle.registration ?? "—"}  |  VIN: ${input.vehicle.vin ?? "—"}`);
  write(
    page1,
    `Fuel: ${input.vehicle.fuelType ?? "—"}  |  Transmission: ${input.vehicle.transmission ?? "—"}  |  Colour: ${
      input.vehicle.colour ?? "—"
    }`
  );
  y -= 4;

  write(page1, "4. Rental details", 11, { bold: true });
  write(page1, `Pickup: ${format(input.pickupAt, "dd MMM yyyy, h:mm a")}`);
  write(page1, `Expected return: ${format(input.dropoffAt, "dd MMM yyyy, h:mm a")}`);
  write(page1, `Daily rate: ${money(input.dailyRateCents)}  |  Daily KM limit: ${input.dailyLimitKm ?? "—"}`);
  write(page1, `KM out: ${input.kmOut ?? "—"}  |  Expected KM in: ${input.expectedKmIn ?? "—"}`);
  write(page1, `Fuel level out: ${input.fuelOut ?? "—"}  |  Bond: ${money(input.bondCents)}`);
  write(page1, `Insurance: ${input.insuranceNotes || "As selected at booking"}`);
  y -= 8;

  write(page1, "5. Terms summary", 11, { bold: true });
  write(
    page1,
    "The hirer accepts all rental terms including insurance excess, fuel policy, excess kilometre charges, late return fees, and damage liability as stated in this agreement.",
    9
  );
  y -= 12;

  write(page1, "6. Signatures", 11, { bold: true });
  const primary = input.drivers.find((d) => d.isPrimary) ?? input.drivers[0];
  const customerSig = await tryEmbedPng(pdf, primary?.signatureUrl);
  const adminSig = await tryEmbedPng(pdf, input.adminSignatureUrl);

  page1.drawText("Customer signature", {
    x: left,
    y,
    size: 9,
    font: bold,
    color: black,
  });
  page1.drawText("Admin signature", {
    x: left + 260,
    y,
    size: 9,
    font: bold,
    color: black,
  });
  y -= 8;

  if (customerSig) {
    page1.drawImage(customerSig, { x: left, y: y - 50, width: 160, height: 50 });
  } else {
    page1.drawText("(signed electronically)", { x: left, y: y - 20, size: 9, font, color: muted });
  }
  if (adminSig) {
    page1.drawImage(adminSig, { x: left + 260, y: y - 50, width: 160, height: 50 });
  } else {
    page1.drawText("(to be signed at pickup)", {
      x: left + 260,
      y: y - 20,
      size: 9,
      font,
      color: muted,
    });
  }

  // Page 2 — conditions
  y = 800;
  write(page2, "LOAN VEHICLE CONDITIONS", 14, { bold: true });
  y -= 4;
  const conditions = [
    "Customer responsibilities: Drive carefully, obey all road rules, and use the vehicle only for lawful purposes. No smoking, no pets (unless approved), and no unauthorized drivers.",
    "Fuel policy: Return the vehicle with the same fuel level recorded at pickup. A fuel charge applies if returned with less fuel.",
    "Excess kilometres: Kilometres above the daily limit are charged at the excess KM rate stated on page 1.",
    "Late return: Returning later than the agreed time may incur hourly late fees and may affect subsequent bookings.",
    "Damage policy: The hirer is responsible for damage, loss, theft, and excess fees according to the selected insurance cover.",
    "Accident procedure: Stop safely, ensure injuries are addressed, call emergency services if needed, exchange details, photograph the scene, and notify the rental desk immediately.",
    "Return procedure: Return the vehicle to the agreed location on time with keys, accessories, and fuel level matching pickup; report any new damage.",
    "Declaration: By signing, the hirer confirms all licence details are accurate, they are authorised to drive, and they accept the full rental terms.",
  ];
  for (const paragraph of conditions) {
    const lines = wrapText(paragraph, 88);
    for (const line of lines) {
      write(page2, line, 10);
    }
    y -= 6;
  }

  write(page2, `Generated ${format(new Date(), "dd MMM yyyy, h:mm a")}`, 8, { color: muted });

  const bytes = await pdf.save();
  return saveBinaryUpload(Buffer.from(bytes), "application/pdf", "agreements", "pdf");
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}
