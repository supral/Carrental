import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { formatVehicleName } from "@/lib/vehicles/display";
import { isViewingTimePassed } from "@/lib/sales/sale-booking-status";
import { formatPrice } from "@/lib/utils";
import {
  ListingPurpose,
  NotificationType,
  Role,
  SaleBookingStatus,
  SalePaymentStatus,
  UserStatus,
  VehicleStatus,
  VehicleInventoryStatus,
} from "@prisma/client";
import { format } from "date-fns";
import { buildSaleBookingStatusUrl } from "@/lib/sales/sale-booking-status";
import { releaseVehicleReservation } from "@/lib/vehicles/reservation-service";
import {
  dismissSaleBookingNotifications,
  dismissViewingFollowUpNotifications,
} from "@/lib/admin/notification-service";

const BLOCKING_SALE_STATUSES: SaleBookingStatus[] = [
  SaleBookingStatus.ACCEPTED,
  SaleBookingStatus.MEETING_SCHEDULED,
  SaleBookingStatus.DEAL_FINALIZED,
  SaleBookingStatus.PAID,
  SaleBookingStatus.COMPLETED,
];

const CANCELLABLE_SALE_STATUSES: SaleBookingStatus[] = [
  SaleBookingStatus.PENDING,
  SaleBookingStatus.MEETING_SCHEDULED,
  SaleBookingStatus.DEAL_FINALIZED,
];

async function notifySaleBookingCancelled(
  booking: {
    customerEmail: string;
    customerName: string;
    vehicle: { title: string | null; make: string; model: string; year: number; vehicleNumber: string | null };
  },
  reason: string
) {
  const vehicleName = formatVehicleName(booking.vehicle);
  await sendEmail({
    to: booking.customerEmail,
    subject: `Purchase request update — ${vehicleName}`,
    text: [
      `Hi ${booking.customerName},`,
      ``,
      reason,
      ``,
      `Vehicle: ${vehicleName}`,
      ``,
      `Browse other vehicles: ${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/vehicles`,
      ``,
      `Everest Car Rental`,
    ].join("\n"),
  });
}

async function vehicleHasBlockingSaleBooking(vehicleId: string) {
  const existing = await prisma.saleBooking.findFirst({
    where: {
      vehicleId,
      status: { in: BLOCKING_SALE_STATUSES },
    },
    select: { id: true },
  });
  if (existing) return true;

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { inventoryStatus: true },
  });

  return (
    vehicle?.inventoryStatus === VehicleInventoryStatus.SOLD ||
    vehicle?.inventoryStatus === VehicleInventoryStatus.RENTED
  );
}

export interface CreateSaleBookingInput {
  vehicleId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerMessage?: string;
  preferredContactTime?: string;
}

export async function createSaleBooking(input: CreateSaleBookingInput) {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: input.vehicleId,
      status: VehicleStatus.ACTIVE,
      listingPurpose: ListingPurpose.SALE,
    },
    include: {
      dealer: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!vehicle) {
    throw new Error("This vehicle is not available for purchase");
  }

  if (await vehicleHasBlockingSaleBooking(vehicle.id)) {
    throw new Error("This vehicle already has an accepted purchase request in progress");
  }

  const booking = await prisma.saleBooking.create({
    data: {
      vehicleId: vehicle.id,
      dealerId: vehicle.dealerId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerAddress: input.customerAddress,
      customerMessage: input.customerMessage,
      preferredContactTime: input.preferredContactTime,
    },
    include: {
      vehicle: {
        select: {
          title: true,
          make: true,
          model: true,
          year: true,
          vehicleNumber: true,
          price: true,
        },
      },
      dealer: { select: { name: true, email: true, phone: true } },
    },
  });

  await notifyAdminsOfNewSaleBooking(booking);
  await sendNewSaleBookingEmails(booking);

  return booking;
}

async function notifyAdminsOfNewSaleBooking(
  booking: Awaited<ReturnType<typeof createSaleBooking>>
) {
  const vehicleName = formatVehicleName(booking.vehicle);
  const admins = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      OR: [
        { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } },
        { dealerId: booking.dealerId },
      ],
    },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: NotificationType.SALE_BOOKING,
      title: "New car purchase request",
      message: `${booking.customerName} requested to buy ${vehicleName}`,
      link: `/admin/sale-bookings?booking=${booking.id}`,
    })),
  });
}

async function sendNewSaleBookingEmails(
  booking: Awaited<ReturnType<typeof createSaleBooking>>
) {
  const vehicleName = formatVehicleName(booking.vehicle);
  const statusUrl = buildSaleBookingStatusUrl(booking.id, booking.customerEmail);
  const adminText = [
    `New purchase request for ${vehicleName}`,
    ``,
    `Customer: ${booking.customerName}`,
    `Email: ${booking.customerEmail}`,
    `Phone: ${booking.customerPhone}`,
    booking.customerAddress ? `Address: ${booking.customerAddress}` : "",
    booking.preferredContactTime ? `Preferred contact time: ${booking.preferredContactTime}` : "",
    booking.customerMessage ? `Message: ${booking.customerMessage}` : "",
    ``,
    `Review in admin: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/sale-bookings`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendEmail({
    to: booking.dealer.email,
    subject: `New purchase request: ${vehicleName}`,
    text: adminText,
  });

  await sendEmail({
    to: booking.customerEmail,
    subject: `We received your request for ${vehicleName}`,
    text: [
      `Hi ${booking.customerName},`,
      ``,
      `Thank you for your interest in the ${vehicleName} at Everest Car Rental.`,
      `Our team has received your request and will contact you shortly to schedule a viewing.`,
      ``,
      `Vehicle: ${vehicleName}`,
      `Listed price: ${formatPrice(booking.vehicle.price)}`,
      ``,
      `Dealer contact: ${booking.dealer.name} — ${booking.dealer.phone}`,
      ``,
      `Track your request: ${statusUrl}`,
      `View all your bookings: ${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/my-bookings?email=${encodeURIComponent(booking.customerEmail)}`,
      ``,
      `Everest Car Rental`,
    ].join("\n"),
  });
}

export async function acceptSaleBooking(bookingId: string) {
  const booking = await prisma.$transaction(async (tx) => {
    const existing = await tx.saleBooking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: {
          select: {
            title: true,
            make: true,
            model: true,
            year: true,
            vehicleNumber: true,
            price: true,
          },
        },
        dealer: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!existing) {
      throw new Error("Booking not found");
    }

    if (existing.status !== SaleBookingStatus.PENDING) {
      throw new Error("Only pending requests can be accepted");
    }

    const alreadyAccepted = await tx.saleBooking.findFirst({
      where: {
        vehicleId: existing.vehicleId,
        id: { not: bookingId },
        status: { in: BLOCKING_SALE_STATUSES },
      },
      select: { id: true },
    });

    if (alreadyAccepted) {
      throw new Error("Another purchase request has already been accepted for this vehicle");
    }

    const updated = await tx.saleBooking.update({
      where: { id: bookingId },
      data: { status: SaleBookingStatus.ACCEPTED },
      include: {
        vehicle: {
          select: {
            title: true,
            make: true,
            model: true,
            year: true,
            vehicleNumber: true,
            price: true,
          },
        },
        dealer: { select: { name: true, email: true, phone: true } },
      },
    });

    const losers = await tx.saleBooking.findMany({
      where: {
        vehicleId: existing.vehicleId,
        id: { not: bookingId },
        status: { in: CANCELLABLE_SALE_STATUSES },
      },
      include: {
        vehicle: {
          select: {
            title: true,
            make: true,
            model: true,
            year: true,
            vehicleNumber: true,
          },
        },
      },
    });

    if (losers.length > 0) {
      await tx.saleBooking.updateMany({
        where: { id: { in: losers.map((row) => row.id) } },
        data: { status: SaleBookingStatus.CANCELLED },
      });
    }

    return { accepted: updated, losers };
  });

  await Promise.all(
    booking.losers.map((loser) =>
      notifySaleBookingCancelled(
        loser,
        "Another customer's purchase request for this vehicle has been accepted, so your request has been automatically cancelled."
      )
    )
  );

  const vehicleName = formatVehicleName(booking.accepted.vehicle);
  const statusUrl = buildSaleBookingStatusUrl(booking.accepted.id, booking.accepted.customerEmail);

  await sendEmail({
    to: booking.accepted.customerEmail,
    subject: `Your request has been accepted — ${vehicleName}`,
    text: [
      `Hi ${booking.accepted.customerName},`,
      ``,
      `Great news — we have accepted your purchase request for the ${vehicleName}.`,
      `Our team will contact you shortly to schedule a viewing.`,
      ``,
      `Vehicle: ${vehicleName}`,
      `Listed price: ${formatPrice(booking.accepted.vehicle.price)}`,
      ``,
      `Track your request: ${statusUrl}`,
      `Contact: ${booking.accepted.dealer.name} — ${booking.accepted.dealer.phone}`,
      ``,
      `Everest Car Rental`,
    ].join("\n"),
  });

  await dismissSaleBookingNotifications(booking.accepted.id);

  return booking.accepted;
}

export async function scheduleSaleBookingMeeting(
  bookingId: string,
  input: {
    meetingScheduledAt: Date;
    meetingLocation: string;
    meetingNotes?: string;
  }
) {
  const current = await prisma.saleBooking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });

  if (!current) {
    throw new Error("Booking not found");
  }

  if (
    current.status !== SaleBookingStatus.ACCEPTED &&
    current.status !== SaleBookingStatus.MEETING_SCHEDULED
  ) {
    throw new Error("Accept this request before scheduling a viewing");
  }

  const booking = await prisma.saleBooking.update({
    where: { id: bookingId },
    data: {
      status: SaleBookingStatus.MEETING_SCHEDULED,
      meetingScheduledAt: input.meetingScheduledAt,
      meetingLocation: input.meetingLocation,
      meetingNotes: input.meetingNotes,
    },
    include: {
      vehicle: {
        select: {
          title: true,
          make: true,
          model: true,
          year: true,
          vehicleNumber: true,
          price: true,
        },
      },
      dealer: { select: { name: true, email: true, phone: true } },
    },
  });

  const vehicleName = formatVehicleName(booking.vehicle);
  const meetingDate = format(booking.meetingScheduledAt!, "EEEE, d MMMM yyyy 'at' h:mm a");
  const statusUrl = buildSaleBookingStatusUrl(booking.id, booking.customerEmail);

  await sendEmail({
    to: booking.customerEmail,
    subject: `Viewing scheduled: ${vehicleName}`,
    text: [
      `Hi ${booking.customerName},`,
      ``,
      `Your viewing for the ${vehicleName} has been scheduled.`,
      ``,
      `Date & time: ${meetingDate}`,
      `Location: ${booking.meetingLocation}`,
      booking.meetingNotes ? `Notes: ${booking.meetingNotes}` : "",
      ``,
      `Track your request: ${statusUrl}`,
      ``,
      `Contact: ${booking.dealer.name} — ${booking.dealer.phone}`,
      ``,
      `We look forward to meeting you.`,
      `Everest Car Rental`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return booking;
}

export async function finalizeSaleBookingDeal(bookingId: string, agreedPriceCents: number) {
  const current = await prisma.saleBooking.findUnique({
    where: { id: bookingId },
    select: { status: true, meetingScheduledAt: true },
  });

  if (!current) {
    throw new Error("Booking not found");
  }

  if (current.status !== SaleBookingStatus.MEETING_SCHEDULED) {
    throw new Error("Schedule a viewing before finalizing the deal");
  }

  if (!current.meetingScheduledAt) {
    throw new Error("Save a viewing date and time before finalizing the deal");
  }

  if (!isViewingTimePassed(current.status, current.meetingScheduledAt)) {
    throw new Error("Finalize the deal only after the scheduled viewing has ended");
  }

  const booking = await prisma.saleBooking.update({
    where: { id: bookingId },
    data: {
      status: SaleBookingStatus.DEAL_FINALIZED,
      agreedPriceCents,
    },
  });

  await dismissViewingFollowUpNotifications(bookingId);

  return booking;
}

export async function markSaleBookingPaid(bookingId: string) {
  const current = await prisma.saleBooking.findUnique({
    where: { id: bookingId },
    select: { status: true, paymentStatus: true },
  });

  if (!current) {
    throw new Error("Booking not found");
  }

  if (current.status !== SaleBookingStatus.DEAL_FINALIZED) {
    throw new Error("Finalize the deal before marking payment received");
  }

  if (current.paymentStatus === SalePaymentStatus.PAID) {
    throw new Error("Payment has already been recorded for this booking");
  }

  const booking = await prisma.saleBooking.update({
    where: { id: bookingId },
    data: {
      status: SaleBookingStatus.PAID,
      paymentStatus: SalePaymentStatus.PAID,
      paidAt: new Date(),
    },
    include: {
      vehicle: {
        select: {
          title: true,
          make: true,
          model: true,
          year: true,
          vehicleNumber: true,
          reservationToken: true,
        },
      },
    },
  });

  await prisma.vehicle.update({
    where: { id: booking.vehicleId },
    data: {
      inventoryStatus: VehicleInventoryStatus.SOLD,
      status: VehicleStatus.SOLD,
      soldAt: new Date(),
      reservedByUserId: null,
      reservationToken: null,
      reservationPurpose: null,
      reservationExpiresAt: null,
    },
  });

  await sendEmail({
    to: booking.customerEmail,
    subject: `Payment received — ${formatVehicleName(booking.vehicle)}`,
    text: [
      `Hi ${booking.customerName},`,
      ``,
      `We have received your payment. Our team will arrange vehicle handover with you shortly.`,
      ``,
      `Everest Car Rental`,
    ].join("\n"),
  });

  return booking;
}

export async function completeSaleBooking(bookingId: string) {
  const booking = await prisma.saleBooking.findUnique({
    where: { id: bookingId },
    include: {
      vehicle: {
        select: {
          title: true,
          make: true,
          model: true,
          year: true,
          vehicleNumber: true,
        },
      },
    },
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.status !== SaleBookingStatus.PAID) {
    throw new Error("Mark payment received before completing delivery");
  }
  if (booking.paymentStatus !== SalePaymentStatus.PAID) {
    throw new Error("Payment must be received before marking the car as provided");
  }

  const [updated] = await prisma.$transaction([
    prisma.saleBooking.update({
      where: { id: bookingId },
      data: {
        status: SaleBookingStatus.COMPLETED,
        completedAt: new Date(),
      },
    }),
    prisma.saleBooking.updateMany({
      where: {
        vehicleId: booking.vehicleId,
        id: { not: bookingId },
        status: { notIn: [SaleBookingStatus.CANCELLED, SaleBookingStatus.COMPLETED] },
      },
      data: { status: SaleBookingStatus.CANCELLED },
    }),
    prisma.vehicle.update({
      where: { id: booking.vehicleId },
      data: {
        status: VehicleStatus.SOLD,
        inventoryStatus: VehicleInventoryStatus.SOLD,
        soldAt: new Date(),
        reservedByUserId: null,
        reservationToken: null,
        reservationPurpose: null,
        reservationExpiresAt: null,
      },
    }),
    prisma.dealer.update({
      where: { id: booking.dealerId },
      data: { totalSales: { increment: 1 } },
    }),
  ]);

  await sendEmail({
    to: booking.customerEmail,
    subject: `Congratulations on your ${formatVehicleName(booking.vehicle)}`,
    text: [
      `Hi ${booking.customerName},`,
      ``,
      `Your purchase is complete and the vehicle has been provided.`,
      `Thank you for choosing Everest Car Rental.`,
      ``,
      `Everest Car Rental`,
    ].join("\n"),
  });

  await dismissSaleBookingNotifications(bookingId);

  return updated;
}

export async function cancelSaleBooking(bookingId: string) {
  const booking = await prisma.saleBooking.findUnique({
    where: { id: bookingId },
    select: { vehicleId: true },
  });

  if (booking) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: booking.vehicleId },
      select: { reservationToken: true },
    });
    if (vehicle?.reservationToken) {
      await releaseVehicleReservation(booking.vehicleId, vehicle.reservationToken);
    }
  }

  const updated = await prisma.saleBooking.update({
    where: { id: bookingId },
    data: { status: SaleBookingStatus.CANCELLED },
  });

  await dismissViewingFollowUpNotifications(bookingId);

  return updated;
}

export async function getSaleBookingStatusForCustomer(bookingId: string, email: string) {
  const booking = await prisma.saleBooking.findUnique({
    where: { id: bookingId },
    include: {
      vehicle: {
        select: {
          id: true,
          title: true,
          make: true,
          model: true,
          year: true,
          vehicleNumber: true,
          price: true,
        },
      },
      dealer: { select: { name: true, phone: true } },
    },
  });

  if (!booking) {
    return null;
  }

  if (booking.customerEmail.toLowerCase() !== email.trim().toLowerCase()) {
    return null;
  }

  return booking;
}
