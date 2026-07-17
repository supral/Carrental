import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import BookingsTable from "@/components/admin/BookingsTable";
import { Button } from "@/components/ui/button";
import { formatVehicleName } from "@/lib/vehicles/display";
import { parsePricedRentalOptionLines } from "@/lib/rentals/option-catalog";
import { Plus } from "lucide-react";

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
      drivers: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = bookings.map((booking) => ({
    id: booking.id,
    vehicleName: formatVehicleName(booking.vehicle),
    customerName: booking.customerName ?? "—",
    customerEmail: booking.customerEmail ?? "—",
    customerPhone: booking.customerPhone ?? undefined,
    customerAddress: booking.customerAddress ?? undefined,
    customerCountry: booking.customerCountry ?? undefined,
    customerDob: booking.customerDob?.toISOString() ?? null,
    drivingLicenceNumber: booking.drivingLicenceNumber,
    licencePhotoUrl: booking.licencePhotoUrl,
    notes: booking.notes,
    drivers: booking.drivers.map((driver) => ({
      id: driver.id,
      isPrimary: driver.isPrimary,
      firstName: driver.firstName,
      lastName: driver.lastName,
      dob: driver.dob?.toISOString() ?? null,
      phone: driver.phone,
      email: driver.email,
      address: driver.address,
      emergencyContact: driver.emergencyContact,
      emergencyPhone: driver.emergencyPhone,
      licenceNumber: driver.licenceNumber,
      licenceExpiry: driver.licenceExpiry?.toISOString() ?? null,
      licenceFrontUrl: driver.licenceFrontUrl,
      licenceBackUrl: driver.licenceBackUrl,
      signatureUrl: driver.signatureUrl,
    })),
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod,
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rental Bookings</h1>
          <p className="text-muted-foreground">{rows.length} total bookings</p>
        </div>
        <Button asChild>
          <Link href="/admin/bookings/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create Booking
          </Link>
        </Button>
      </div>
      <BookingsTable bookings={rows} />
    </div>
  );
}
