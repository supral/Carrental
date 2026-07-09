import { prisma } from "@/lib/prisma";
import { formatVehicleName } from "@/lib/vehicles/display";

export async function getCustomerBookingsByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const [saleBookings, rentalBookings] = await Promise.all([
    prisma.saleBooking.findMany({
      where: { customerEmail: { equals: email.trim(), mode: "insensitive" } },
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
      orderBy: { createdAt: "desc" },
    }),
    prisma.rentalBooking.findMany({
      where: { customerEmail: { equals: email.trim(), mode: "insensitive" } },
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
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    email: normalizedEmail,
    saleBookings: saleBookings.map((booking) => ({
      id: booking.id,
      type: "sale" as const,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      customerName: booking.customerName,
      vehicleId: booking.vehicle.id,
      vehicleName: formatVehicleName(booking.vehicle),
      vehiclePrice: booking.vehicle.price,
      agreedPriceCents: booking.agreedPriceCents,
      meetingScheduledAt: booking.meetingScheduledAt?.toISOString() ?? null,
      meetingLocation: booking.meetingLocation,
      dealerName: booking.dealer.name,
      dealerPhone: booking.dealer.phone,
      createdAt: booking.createdAt.toISOString(),
      paidAt: booking.paidAt?.toISOString() ?? null,
      completedAt: booking.completedAt?.toISOString() ?? null,
      statusUrl: `/vehicles/booking/status?id=${booking.id}&email=${encodeURIComponent(booking.customerEmail)}`,
    })),
    rentalBookings: rentalBookings.map((booking) => ({
      id: booking.id,
      type: "rental" as const,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      customerName: booking.customerName,
      vehicleId: booking.vehicle.id,
      vehicleName: formatVehicleName(booking.vehicle),
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      pickupAt: booking.pickupAt.toISOString(),
      dropoffAt: booking.dropoffAt.toISOString(),
      rentalDays: booking.rentalDays,
      totalAmountCents: booking.totalAmountCents,
      createdAt: booking.createdAt.toISOString(),
      paidAt: booking.paidAt?.toISOString() ?? null,
      statusUrl: `/car-rental/booking/status?id=${booking.id}&email=${encodeURIComponent(booking.customerEmail ?? email.trim())}`,
    })),
  };
}

export async function getRentalBookingStatusForCustomer(bookingId: string, email: string) {
  const booking = await prisma.rentalBooking.findUnique({
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
    },
  });

  if (!booking?.customerEmail) return null;
  if (booking.customerEmail.toLowerCase() !== email.trim().toLowerCase()) return null;

  return booking;
}
