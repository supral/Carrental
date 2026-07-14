import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import FleetVehiclesTable from "@/components/admin/FleetVehiclesTable";
import { listFleetVehicles } from "@/lib/admin/fleet-vehicle-actions";

export const dynamic = "force-dynamic";

export default async function AdminFleetPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const rows = await listFleetVehicles();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Rental Fleet" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Rental Fleet</h1>
        <p className="text-muted-foreground">
          Fleet # identifies each physical car. Fleet Size / Available / Rented are live counts for
          that vehicle type (not stored).
        </p>
      </div>
      <FleetVehiclesTable rows={rows} />
    </div>
  );
}
