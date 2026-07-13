import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/admin/permissions";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import VehicleForm from "@/components/admin/VehicleForm";
import { listVehicleTypes } from "@/lib/admin/vehicle-type-actions";
import { listRentalOptions } from "@/lib/admin/rental-option-actions";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const session = await auth();
  if (!session) redirect("/admin/login");
  if (!hasPermission(session.user.role, "vehicles:manage")) redirect("/admin/vehicles");

  const dealers = await prisma.dealer.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const [vehicleTypes, rentalOptions] = await Promise.all([
    listVehicleTypes(),
    listRentalOptions({ activeOnly: true }),
  ]);

  if (dealers.length === 0) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Vehicle Types", href: "/admin/vehicles" }, { label: "Add New" }]} />
        <h1 className="text-2xl font-bold mb-2">Create Vehicle Type</h1>
        <p className="text-muted-foreground">Add an approved dealer before creating vehicle types.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <AdminBreadcrumbs items={[{ label: "Vehicle Types", href: "/admin/vehicles" }, { label: "Add New" }]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create Vehicle Type</h1>
        <p className="mt-1 text-muted-foreground">
          Define a reusable rental template (specs, pricing, images). Then add physical units under Rental Fleet.
        </p>
      </div>
      <VehicleForm
        dealers={dealers}
        vehicleTypes={vehicleTypes.map((type) => ({ id: type.id, name: type.name }))}
        rentalOptions={rentalOptions}
        canPublishLive={hasPermission(session.user.role, "vehicles:approve")}
        rentalOnly
      />
    </div>
  );
}
