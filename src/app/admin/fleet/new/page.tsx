import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import CreateFleetVehicleForm from "@/components/admin/CreateFleetVehicleForm";
import { listVehicleTypesForFleet } from "@/lib/admin/fleet-vehicle-actions";
import { listRentalOptions } from "@/lib/admin/rental-option-actions";
import { isSuperAdmin } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";
/** Allow bulk createMany of up to 500 units on Vercel/Neon. */
export const maxDuration = 60;

export default async function AdminNewFleetVehiclePage({
  searchParams,
}: {
  searchParams?: Promise<{ vehicleId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const params = (await searchParams) ?? {};
  const [vehicleTypes, rentalOptions] = await Promise.all([
    listVehicleTypesForFleet(),
    listRentalOptions({ activeOnly: true }),
  ]);

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
          Choose year and how many cars to add. Fleet Numbers (MGZS-001, MGZS-002, …) are assigned
          automatically.
        </p>
      </div>
      <CreateFleetVehicleForm
        vehicleTypes={vehicleTypes.map((type) => ({
          id: type.id,
          title: type.title,
          fleetCount: type.fleetCount,
        }))}
        rentalOptions={rentalOptions}
        initialVehicleId={params.vehicleId}
        canOverrideFleetNumber={isSuperAdmin(session.user.role)}
      />
    </div>
  );
}
