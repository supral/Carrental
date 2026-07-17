import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { FleetVehicleStatus } from "@prisma/client";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFleetTypeRoster } from "@/lib/admin/fleet-vehicle-actions";
import { formatRentalBookingStatus } from "@/lib/rentals/rental-booking-status";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<FleetVehicleStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  RENTED: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-amber-100 text-amber-800",
  RESERVED: "bg-purple-100 text-purple-800",
  INACTIVE: "bg-gray-100 text-gray-700",
};

export default async function FleetTypeHistoryPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const { vehicleId } = await params;
  const roster = await getFleetTypeRoster(vehicleId);
  if (!roster) notFound();

  const { vehicle, stats, units } = roster;

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Rental Fleet", href: "/admin/fleet" },
          { label: vehicle.title },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{vehicle.title}</h1>
          <p className="text-muted-foreground">
            {stats.fleetSize} physical unit{stats.fleetSize === 1 ? "" : "s"} under this vehicle type
            (each has its own Fleet #)
            {vehicle.make && vehicle.make !== "Rental"
              ? ` · ${vehicle.make} ${vehicle.model}`
              : ""}
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/fleet/new?vehicleId=${vehicle.id}`}>Add fleet unit</Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Fleet Size", value: stats.fleetSize },
          { label: "Available", value: stats.available },
          { label: "Rented", value: stats.rented },
          { label: "Reserved", value: stats.reserved },
          { label: "Maintenance", value: stats.maintenance },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {units.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No physical vehicles yet.{" "}
          <Link
            href={`/admin/fleet/new?vehicleId=${vehicle.id}`}
            className="font-medium text-primary hover:underline"
          >
            Add the first unit
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Fleet Number</th>
                <th className="px-3 py-2">Registration</th>
                <th className="px-3 py-2">VIN</th>
                <th className="px-3 py-2">Current KM</th>
                <th className="px-3 py-2">Fuel Level</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Current Booking</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono font-semibold">{unit.fleetNumber}</td>
                  <td className="px-3 py-2">{unit.registrationNumber || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{unit.vinNumber || "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {unit.currentKm != null ? `${unit.currentKm.toLocaleString()} km` : "—"}
                  </td>
                  <td className="px-3 py-2">{unit.currentFuelLevel || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge className={STATUS_CLASS[unit.status]}>{unit.status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {unit.currentBooking ? (
                      <div>
                        <Link
                          href={`/admin/bookings/${unit.currentBooking.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {unit.currentBooking.customerName || "Booking"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatRentalBookingStatus(unit.currentBooking.status)}
                          {" · "}
                          {format(new Date(unit.currentBooking.pickupAt), "dd MMM")}
                          {" → "}
                          {format(new Date(unit.currentBooking.dropoffAt), "dd MMM")}
                        </p>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/fleet/${unit.id}/history`}>Rentals</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
