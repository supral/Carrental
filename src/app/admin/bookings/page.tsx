import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import BookingsTable from "@/components/admin/BookingsTable";
import { formatVehicleName } from "@/lib/vehicles/display";
import { parsePricedRentalOptionLines } from "@/lib/rentals/option-catalog";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const bookings = await prisma.rentalBooking.findMany({
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
    orderBy: { createdAt: "desc" },
  });

  const rows = bookings.map((booking) => ({
    id: booking.id,
    vehicleName: formatVehicleName(booking.vehicle),
    customerName: booking.customerName ?? "—",
    customerEmail: booking.customerEmail ?? "—",
    customerAddress: booking.customerAddress ?? undefined,
    customerZip: booking.customerZip ?? undefined,
    customerCountry: booking.customerCountry ?? undefined,
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    baseAmountCents: booking.baseAmountCents,
    extrasAmountCents: booking.extrasAmountCents,
    taxAmountCents: booking.taxAmountCents,
    totalAmountCents: booking.totalAmountCents,
    selectedOptions: parsePricedRentalOptionLines(booking.selectedOptions),
    createdAt: booking.createdAt,
  }));

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Rental Bookings" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Rental Bookings</h1>
        <p className="text-muted-foreground">{rows.length} total bookings</p>
      </div>
      <BookingsTable bookings={rows} />
    </div>
  );
}
