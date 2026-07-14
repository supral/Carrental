import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import CreateRentalBookingForm from "@/components/admin/CreateRentalBookingForm";
import { listActiveRentalVehiclesForBooking } from "@/lib/admin/rental-booking-actions";

export const dynamic = "force-dynamic";

export default async function AdminCreateBookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const query = await searchParams;
  const initialVehicleId =
    typeof query.vehicleId === "string" ? query.vehicleId : undefined;
  const initialPickupDate =
    typeof query.pickupDate === "string" ? query.pickupDate : undefined;
  const initialDropoffDate =
    typeof query.dropoffDate === "string" ? query.dropoffDate : undefined;

  const vehicles = await listActiveRentalVehiclesForBooking();

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Rental Bookings", href: "/admin/bookings" },
          { label: "Create Booking" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create Rental Booking</h1>
        <p className="text-muted-foreground">
          Book a vehicle for walk-in or phone customers and check availability on the calendar.
        </p>
      </div>
      <CreateRentalBookingForm
        vehicles={vehicles}
        initialVehicleId={initialVehicleId}
        initialPickupDate={initialPickupDate}
        initialDropoffDate={initialDropoffDate}
      />
    </div>
  );
}
