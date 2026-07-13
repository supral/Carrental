import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import CreateFleetVehicleForm from "@/components/admin/CreateFleetVehicleForm";
import { listVehicleTypesForFleet } from "@/lib/admin/fleet-vehicle-actions";

export const dynamic = "force-dynamic";

export default async function AdminNewFleetVehiclePage({
  searchParams,
}: {
  searchParams?: Promise<{ vehicleId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const params = (await searchParams) ?? {};
  const vehicleTypes = await listVehicleTypesForFleet();

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Rental Fleet", href: "/admin/fleet" },
          { label: "Add Vehicle" },
        ]}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add fleet vehicle</h1>
        <p className="text-muted-foreground">
          Choose a vehicle type, then enter only the physical unit details.
        </p>
      </div>
      <CreateFleetVehicleForm
        vehicleTypes={vehicleTypes}
        initialVehicleId={params.vehicleId}
      />
    </div>
  );
}
