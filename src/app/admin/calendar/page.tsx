import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import RentalBookingCalendar from "@/components/admin/RentalBookingCalendar";

export const dynamic = "force-dynamic";

export default async function AdminBookingCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ vehicleId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const params = (await searchParams) ?? {};

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Booking Calendar" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Booking Calendar</h1>
        <p className="text-muted-foreground">
          See rentals across vehicles as bars on the calendar. Click a rental to edit.
        </p>
      </div>
      <RentalBookingCalendar initialVehicleId={params.vehicleId ?? null} />
    </div>
  );
}
