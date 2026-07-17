import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import FleetVehiclesTable from "@/components/admin/FleetVehiclesTable";
import { listFleetTypeSummaries } from "@/lib/admin/fleet-vehicle-actions";

export const dynamic = "force-dynamic";

export default async function AdminFleetPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const rows = await listFleetTypeSummaries();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Rental Fleet" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Rental Fleet</h1>
        <p className="text-muted-foreground">
          One row per vehicle type. Fleet Size is how many physical cars (e.g. Prado · 42). Open{" "}
          <span className="font-medium">View units</span> to see each Fleet # (PRADO-001, PRADO-002,
          …).
        </p>
      </div>
      <FleetVehiclesTable rows={rows} />
    </div>
  );
}
