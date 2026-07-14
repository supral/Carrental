import {
  FleetVehicleStatus,
  Prisma,
  RentalBookingStatus,
  RentalPaymentStatus,
} from "@prisma/client";
import { addDays } from "date-fns";
import { siteConfig } from "@/data/services";
import { prisma } from "@/lib/prisma";
import {
  calculateReturnCharges,
  DEFAULT_BOND_CENTS,
  DEFAULT_DAILY_LIMIT_KM,
  DEFAULT_EXCESS_KM_RATE_CENTS,
  DEFAULT_FUEL_CHARGE_CENTS,
} from "@/lib/rentals/rental-charges";
import { generateRentalAgreementPdf } from "@/lib/rentals/rental-agreement-pdf";
import {
  createAgreementToken,
  type CustomerAgreementFormInput,
  type PickupChecklistInput,
  type ReturnChecklistInput,
} from "@/lib/rentals/rental-agreement-validation";
import { handleRentalBookingStatusChange } from "@/lib/rentals/rental-inventory-units";
import {
  sendRentalAgreementCompletedEmail,
  sendRentalAgreementPdfEmail,
  sendRentalAgreementRequestEmail,
  sendRentalClosedEmail,
  sendRentalInvoiceEmail,
  sendVehicleReadyEmail,
} from "@/lib/rentals/rental-workflow-emails";
import { saveDataUrlUpload } from "@/lib/uploads/rental-file-storage";

const AGREEMENT_TOKEN_DAYS = 30;

export async function issueAgreementTokenAndRequestForm(
  bookingId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const token = createAgreementToken();
  const expiresAt = addDays(new Date(), AGREEMENT_TOKEN_DAYS);
  const booking = await client.rentalBooking.update({
    where: { id: bookingId },
    data: {
      agreementToken: token,
      agreementTokenExpiresAt: expiresAt,
      status: RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM,
    },
    select: {
      id: true,
      customerEmail: true,
      customerName: true,
      pickupAt: true,
      dropoffAt: true,
      agreementToken: true,
      status: true,
    },
  });
  return booking;
}

/** Ensure token exists and email the customer the agreement link (send or resend). */
export async function sendOrResendAgreementRequestEmail(bookingId: string) {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      customerEmail: true,
      customerName: true,
      pickupAt: true,
      dropoffAt: true,
      agreementToken: true,
      agreementTokenExpiresAt: true,
      customerFormCompletedAt: true,
    },
  });

  if (!booking) throw new Error("Booking not found");
  if (!booking.customerEmail) throw new Error("Customer email is missing");
  if (booking.status === RentalBookingStatus.CANCELLED) {
    throw new Error("Cannot send agreement for a cancelled booking");
  }
  if (booking.customerFormCompletedAt) {
    throw new Error("Customer has already completed the rental agreement");
  }

  const tokenExpired =
    !booking.agreementToken ||
    (booking.agreementTokenExpiresAt != null &&
      booking.agreementTokenExpiresAt.getTime() < Date.now());

  let token = booking.agreementToken;
  let status: RentalBookingStatus = booking.status;

  if (
    tokenExpired ||
    status === RentalBookingStatus.CONFIRMED ||
    status === RentalBookingStatus.PENDING ||
    status === RentalBookingStatus.RESERVED
  ) {
    const previousStatus = booking.status;
    const updated = await prisma.$transaction(async (tx) => {
      const next = await issueAgreementTokenAndRequestForm(bookingId, tx);
      if (previousStatus !== RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM) {
        await handleRentalBookingStatusChange(
          bookingId,
          previousStatus,
          RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM,
          tx
        );
      }
      return next;
    });
    token = updated.agreementToken;
    status = updated.status;
  }

  if (!token) throw new Error("Failed to create agreement link");

  await sendRentalAgreementRequestEmail({
    id: booking.id,
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
    agreementToken: token,
  });

  const { buildRentalAgreementUrl } = await import("@/lib/rentals/rental-workflow-emails");
  return {
    ok: true as const,
    status,
    agreementUrl: buildRentalAgreementUrl(booking.id, token),
  };
}

function splitCustomerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Customer", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function typedSignatureDataUrl(signatureText: string): string {
  const escaped = signatureText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="160"><rect width="100%" height="100%" fill="white"/><text x="32" y="98" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="#0f172a">${escaped}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export type AdminAssistedAgreementInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerDob: Date;
  drivingLicenceNumber: string;
  licencePhotoUrl: string;
  licenceExpiry?: string | null;
  signatureText: string;
  terms: {
    rentalTerms: true;
    insuranceExcess: true;
    fuelPolicy: true;
    extraKilometres: true;
    lateReturnCharges: true;
    damagePolicy: true;
  };
};

/**
 * Admin fills agreement details for walk-in customers who cannot use the online form.
 * Marks the booking ready for vehicle assignment.
 */
export async function applyAdminAssistedAgreement(
  bookingId: string,
  input: AdminAssistedAgreementInput
) {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, customerFormCompletedAt: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.customerFormCompletedAt) return;

  const previousStatus = booking.status;
  const { firstName, lastName } = splitCustomerName(input.customerName);
  const signatureUrl = await saveDataUrlUpload(
    typedSignatureDataUrl(input.signatureText.trim()),
    "signatures"
  );

  await prisma.$transaction(async (tx) => {
    await tx.rentalDriver.deleteMany({ where: { bookingId } });
    await tx.rentalDriver.create({
      data: {
        bookingId,
        isPrimary: true,
        sortOrder: 0,
        firstName,
        lastName,
        dob: input.customerDob,
        phone: input.customerPhone,
        email: input.customerEmail,
        address: input.customerAddress || null,
        licenceNumber: input.drivingLicenceNumber,
        licenceExpiry: input.licenceExpiry ? new Date(input.licenceExpiry) : null,
        licenceFrontUrl: input.licencePhotoUrl,
        licenceBackUrl: input.licencePhotoUrl,
        signatureUrl,
      },
    });

    await tx.rentalBooking.update({
      where: { id: bookingId },
      data: {
        status: RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT,
        customerFormCompletedAt: new Date(),
        termsAcceptedAt: new Date(),
        termsFlags: input.terms,
        drivingLicenceNumber: input.drivingLicenceNumber,
        licencePhotoUrl: input.licencePhotoUrl,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress || null,
        customerDob: input.customerDob,
      },
    });

    await handleRentalBookingStatusChange(
      bookingId,
      previousStatus,
      RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT,
      tx
    );
  });

  const dates = await prisma.rentalBooking.findUniqueOrThrow({
    where: { id: bookingId },
    select: { pickupAt: true, dropoffAt: true },
  });

  await sendRentalAgreementCompletedEmail({
    id: bookingId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    pickupAt: dates.pickupAt,
    dropoffAt: dates.dropoffAt,
  }).catch(() => undefined);
}

export async function afterBookingConfirmedStartAgreement(bookingId: string) {
  const previous = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });
  if (!previous) return;

  const updated = await prisma.$transaction(async (tx) => {
    await handleRentalBookingStatusChange(
      bookingId,
      previous.status,
      RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM,
      tx
    );
    return issueAgreementTokenAndRequestForm(bookingId, tx);
  });

  if (updated.agreementToken) {
    await sendRentalAgreementRequestEmail({
      id: updated.id,
      customerEmail: updated.customerEmail,
      customerName: updated.customerName,
      pickupAt: updated.pickupAt,
      dropoffAt: updated.dropoffAt,
      agreementToken: updated.agreementToken,
    });
  }

  return updated;
}

export async function getAgreementBookingByToken(bookingId: string, token: string) {
  const booking = await prisma.rentalBooking.findFirst({
    where: {
      id: bookingId,
      agreementToken: token,
      status: { not: RentalBookingStatus.CANCELLED },
    },
    include: {
      vehicle: {
        select: {
          title: true,
          make: true,
          model: true,
          year: true,
        },
      },
      drivers: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!booking) return null;
  if (
    booking.agreementTokenExpiresAt &&
    booking.agreementTokenExpiresAt.getTime() < Date.now()
  ) {
    return null;
  }
  return booking;
}

export async function submitCustomerRentalAgreement(
  bookingId: string,
  token: string,
  input: CustomerAgreementFormInput
) {
  const booking = await getAgreementBookingByToken(bookingId, token);
  if (!booking) throw new Error("Invalid or expired agreement link");
  if (
    booking.status !== RentalBookingStatus.WAITING_FOR_CUSTOMER_FORM &&
    booking.status !== RentalBookingStatus.CONFIRMED
  ) {
    throw new Error("This agreement has already been submitted");
  }

  const previousStatus = booking.status;

  await prisma.$transaction(async (tx) => {
    await tx.rentalDriver.deleteMany({ where: { bookingId } });

    for (let i = 0; i < input.drivers.length; i++) {
      const driver = input.drivers[i];
      const signatureUrl = await saveDataUrlUpload(driver.signatureDataUrl, "signatures");
      await tx.rentalDriver.create({
        data: {
          bookingId,
          isPrimary: driver.isPrimary || i === 0,
          sortOrder: i,
          firstName: driver.firstName,
          lastName: driver.lastName,
          dob: new Date(driver.dob),
          phone: driver.phone,
          email: driver.email || null,
          address: driver.address || null,
          emergencyContact: driver.emergencyContact || null,
          emergencyPhone: driver.emergencyPhone || null,
          licenceNumber: driver.licenceNumber,
          licenceExpiry: new Date(driver.licenceExpiry),
          licenceFrontUrl: driver.licenceFrontUrl,
          licenceBackUrl: driver.licenceBackUrl,
          signatureUrl,
        },
      });
    }

    const primary = input.drivers.find((d) => d.isPrimary) ?? input.drivers[0];

    await tx.rentalBooking.update({
      where: { id: bookingId },
      data: {
        status: RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT,
        customerFormCompletedAt: new Date(),
        termsAcceptedAt: new Date(),
        termsFlags: input.terms,
        customerName: `${primary.firstName} ${primary.lastName}`.trim(),
        customerEmail: primary.email || booking.customerEmail,
        customerPhone: primary.phone || booking.customerPhone,
        customerAddress: primary.address || booking.customerAddress,
        customerDob: new Date(primary.dob),
        drivingLicenceNumber: primary.licenceNumber,
        licencePhotoUrl: primary.licenceFrontUrl,
      },
    });

    await handleRentalBookingStatusChange(
      bookingId,
      previousStatus,
      RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT,
      tx
    );
  });

  await sendRentalAgreementCompletedEmail({
    id: booking.id,
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
  });
}

export async function assignVehicleAndCompletePickup(
  bookingId: string,
  input: PickupChecklistInput
) {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    include: {
      drivers: { orderBy: { sortOrder: "asc" } },
      vehicle: true,
    },
  });
  if (!booking) throw new Error("Booking not found");
  if (
    booking.status !== RentalBookingStatus.WAITING_FOR_VEHICLE_ASSIGNMENT &&
    booking.status !== RentalBookingStatus.READY_FOR_PICKUP &&
    booking.status !== RentalBookingStatus.CONFIRMED
  ) {
    throw new Error("Booking is not ready for vehicle assignment / pickup");
  }
  if (!booking.customerFormCompletedAt && booking.drivers.length === 0) {
    throw new Error("Customer rental agreement form is not completed");
  }

  const fleet = await prisma.fleetVehicle.findUnique({
    where: { id: input.fleetVehicleId },
    include: { vehicle: true },
  });
  if (!fleet || fleet.vehicleId !== booking.vehicleId) {
    throw new Error("Selected fleet vehicle does not match this booking");
  }

  const adminSignatureUrl = await saveDataUrlUpload(input.adminSignatureDataUrl, "signatures");
  const previousStatus = booking.status;

  await prisma.$transaction(async (tx) => {
    await tx.rentalBooking.update({
      where: { id: bookingId },
      data: {
        fleetVehicleId: fleet.id,
        kmOut: input.kmOut,
        expectedKmIn: input.expectedKmIn,
        fuelOut: input.fuelOut,
        timeOut: new Date(input.timeOut),
        expectedReturnAt: new Date(input.expectedReturnAt),
        dailyRateCents: input.dailyRateCents,
        dailyLimitKm: input.dailyLimitKm,
        excessKmRateCents: input.excessKmRateCents,
        bondCents: input.bondCents,
        insuranceNotes: input.insuranceNotes || null,
        notes: input.notes || booking.notes,
        adminPickupSignatureUrl: adminSignatureUrl,
        status: RentalBookingStatus.ACTIVE,
      },
    });

    await tx.fleetVehicle.update({
      where: { id: fleet.id },
      data: {
        currentKm: input.kmOut,
        odometer: input.kmOut,
        currentFuelLevel: input.fuelOut,
        status: FleetVehicleStatus.RENTED,
      },
    });

    await handleRentalBookingStatusChange(
      bookingId,
      previousStatus,
      RentalBookingStatus.ACTIVE,
      tx
    );
  });

  const drivers = await prisma.rentalDriver.findMany({
    where: { bookingId },
    orderBy: { sortOrder: "asc" },
  });

  const pdfUrl = await generateRentalAgreementPdf({
    bookingId,
    companyName: siteConfig.name,
    companyEmail: siteConfig.email,
    companyPhone: siteConfig.phone,
    customerName:
      booking.customerName ??
      `${drivers[0]?.firstName ?? ""} ${drivers[0]?.lastName ?? ""}`.trim(),
    customerEmail: booking.customerEmail ?? "",
    customerPhone: booking.customerPhone ?? "",
    customerAddress: booking.customerAddress ?? "",
    drivers,
    vehicle: {
      year: fleet.year ?? fleet.vehicle.year,
      make: fleet.vehicle.make,
      model: fleet.vehicle.model,
      registration: fleet.registrationNumber,
      vin: fleet.vinNumber,
      fuelType: fleet.fuelType ?? fleet.vehicle.fuelType,
      transmission: fleet.transmission ?? fleet.vehicle.transmission,
      colour: fleet.color ?? fleet.vehicle.color,
    },
    pickupAt: new Date(input.timeOut),
    dropoffAt: new Date(input.expectedReturnAt),
    kmOut: input.kmOut,
    expectedKmIn: input.expectedKmIn,
    fuelOut: input.fuelOut,
    dailyRateCents: input.dailyRateCents,
    dailyLimitKm: input.dailyLimitKm,
    bondCents: input.bondCents,
    insuranceNotes: input.insuranceNotes,
    adminSignatureUrl,
  });

  await prisma.$transaction(async (tx) => {
    await tx.rentalBooking.update({
      where: { id: bookingId },
      data: { agreementPdfUrl: pdfUrl },
    });
    await tx.rentalDocument.create({
      data: {
        bookingId,
        pdfUrl,
        customerSigned: true,
        adminSigned: true,
      },
    });
  });

  const result = { pdfUrl, fleet };

  const vehicleLabel = `${fleet.vehicle.year} ${fleet.vehicle.make} ${fleet.vehicle.model} (${fleet.registrationNumber ?? fleet.fleetNumber})`;

  await sendVehicleReadyEmail({
    id: booking.id,
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
    vehicleLabel,
  });

  await sendRentalAgreementPdfEmail({
    id: booking.id,
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
    agreementPdfUrl: result.pdfUrl,
  });

  return result;
}

export async function processVehicleReturn(bookingId: string, input: ReturnChecklistInput) {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    include: { fleetVehicle: { include: { vehicle: true } } },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== RentalBookingStatus.ACTIVE) {
    throw new Error("Only active rentals can be returned");
  }
  if (booking.kmOut == null || !booking.fuelOut || !booking.expectedReturnAt) {
    throw new Error("Pickup checklist incomplete");
  }

  const adminSignatureUrl = await saveDataUrlUpload(input.adminSignatureDataUrl, "signatures");
  const returnedAt = new Date(input.returnedAt);
  const charges = calculateReturnCharges({
    kmOut: booking.kmOut,
    expectedKmIn: booking.expectedKmIn ?? booking.kmOut,
    kmIn: input.kmIn,
    fuelOut: booking.fuelOut,
    fuelIn: input.fuelIn,
    excessKmRateCents: booking.excessKmRateCents ?? DEFAULT_EXCESS_KM_RATE_CENTS,
    fuelChargeCents: input.fuelChargeOverrideCents ?? DEFAULT_FUEL_CHARGE_CENTS,
    expectedReturnAt: booking.expectedReturnAt,
    returnedAt,
    damageChargeCents: input.damageChargeCents,
    rentalTotalCents: booking.totalAmountCents,
  });

  const previousStatus = booking.status;
  const nextStatus =
    charges.outstandingBalanceCents > 0
      ? RentalBookingStatus.AWAITING_PAYMENT
      : RentalBookingStatus.RETURNED;

  await prisma.$transaction(async (tx) => {
    await tx.rentalBooking.update({
      where: { id: bookingId },
      data: {
        kmIn: input.kmIn,
        fuelIn: input.fuelIn,
        returnedAt,
        lateReturn: charges.lateReturn,
        damageNotes: input.damageNotes || null,
        damagePhotoUrls: input.damagePhotoUrls,
        accessoriesChecklist: input.accessoriesChecklist ?? undefined,
        adminReturnSignatureUrl: adminSignatureUrl,
        extraKmChargeCents: charges.extraKmChargeCents,
        fuelChargeCents: charges.fuelChargeCents,
        lateFeeCents: charges.lateFeeCents,
        damageChargeCents: charges.damageChargeCents,
        outstandingBalanceCents: charges.outstandingBalanceCents,
        status: nextStatus,
        paymentStatus:
          charges.outstandingBalanceCents > 0
            ? RentalPaymentStatus.PENDING
            : booking.paymentStatus,
      },
    });

    if (booking.fleetVehicleId) {
      await tx.fleetVehicle.update({
        where: { id: booking.fleetVehicleId },
        data: {
          currentKm: input.kmIn,
          odometer: input.kmIn,
          currentFuelLevel: input.fuelIn,
          status: FleetVehicleStatus.AVAILABLE,
        },
      });
    }

    await handleRentalBookingStatusChange(bookingId, previousStatus, nextStatus, tx);
  });

  const invoiceSummary = [
    `Extra KM: $${(charges.extraKmChargeCents / 100).toFixed(2)}`,
    `Fuel: $${(charges.fuelChargeCents / 100).toFixed(2)}`,
    `Late fee: $${(charges.lateFeeCents / 100).toFixed(2)}`,
    `Damage: $${(charges.damageChargeCents / 100).toFixed(2)}`,
    `Outstanding: $${(charges.outstandingBalanceCents / 100).toFixed(2)}`,
  ].join("\n");

  await sendRentalInvoiceEmail({
    id: booking.id,
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
    invoiceSummary,
  });

  return charges;
}

export async function markRentalSettlementPaid(bookingId: string) {
  const booking = await prisma.rentalBooking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Booking not found");
  if (
    booking.status !== RentalBookingStatus.AWAITING_PAYMENT &&
    booking.status !== RentalBookingStatus.RETURNED
  ) {
    throw new Error("Booking is not awaiting settlement");
  }

  await prisma.rentalBooking.update({
    where: { id: bookingId },
    data: {
      outstandingBalanceCents: 0,
      paymentStatus: RentalPaymentStatus.PAID,
      settlementPaidAt: new Date(),
      status: RentalBookingStatus.RETURNED,
    },
  });
}

export async function completeRental(bookingId: string) {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
  });
  if (!booking) throw new Error("Booking not found");
  if (
    booking.status !== RentalBookingStatus.RETURNED &&
    booking.status !== RentalBookingStatus.AWAITING_PAYMENT
  ) {
    throw new Error("Return the vehicle before completing the rental");
  }
  if ((booking.outstandingBalanceCents ?? 0) > 0) {
    throw new Error("Clear outstanding payment before completing the rental");
  }

  const previousStatus = booking.status;

  await prisma.$transaction(async (tx) => {
    await tx.rentalBooking.update({
      where: { id: bookingId },
      data: { status: RentalBookingStatus.COMPLETED },
    });

    if (booking.fleetVehicleId) {
      await tx.fleetVehicle.update({
        where: { id: booking.fleetVehicleId },
        data: {
          currentKm: booking.kmIn ?? undefined,
          odometer: booking.kmIn ?? undefined,
          currentFuelLevel: booking.fuelIn ?? undefined,
          status: FleetVehicleStatus.AVAILABLE,
        },
      });

      await tx.vehicleRentalHistory.create({
        data: {
          fleetVehicleId: booking.fleetVehicleId,
          bookingId,
          customerName: booking.customerName,
          pickupAt: booking.timeOut ?? booking.pickupAt,
          returnAt: booking.returnedAt ?? undefined,
          kmOut: booking.kmOut,
          kmIn: booking.kmIn,
          damageNotes: booking.damageNotes,
          totalChargesCents:
            (booking.extraKmChargeCents ?? 0) +
            (booking.fuelChargeCents ?? 0) +
            (booking.lateFeeCents ?? 0) +
            (booking.damageChargeCents ?? 0),
          agreementPdfUrl: booking.agreementPdfUrl,
        },
      });
    }

    await handleRentalBookingStatusChange(
      bookingId,
      previousStatus,
      RentalBookingStatus.COMPLETED,
      tx
    );
  });

  const total =
    (booking.extraKmChargeCents ?? 0) +
    (booking.fuelChargeCents ?? 0) +
    (booking.lateFeeCents ?? 0) +
    (booking.damageChargeCents ?? 0);

  await sendRentalClosedEmail({
    id: booking.id,
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
    totalChargesLabel: `$${(total / 100).toFixed(2)}`,
  });
}

export function pickupDefaultsFromFleet(fleet: {
  currentKm: number | null;
  odometer: number | null;
  currentFuelLevel: string | null;
  vehicle: { price: number };
}, booking: { dropoffAt: Date; rentalDays: number; totalAmountCents: number; baseAmountCents: number }) {
  const kmOut = fleet.currentKm ?? fleet.odometer ?? 0;
  const dailyLimit = DEFAULT_DAILY_LIMIT_KM;
  return {
    kmOut,
    expectedKmIn: kmOut + dailyLimit * Math.max(1, booking.rentalDays),
    fuelOut: fleet.currentFuelLevel ?? "Full",
    dailyRateCents: booking.baseAmountCents || fleet.vehicle.price * 100,
    dailyLimitKm: dailyLimit,
    excessKmRateCents: DEFAULT_EXCESS_KM_RATE_CENTS,
    bondCents: DEFAULT_BOND_CENTS,
    expectedReturnAt: booking.dropoffAt.toISOString(),
  };
}
