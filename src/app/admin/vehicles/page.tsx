import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import VehiclesTable from "@/components/admin/VehiclesTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { hasPermission } from "@/lib/admin/permissions";
import { clearOffersOnSoldVehicles } from "@/lib/vehicles/vehicle-offers-server";
import { ListingPurpose } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const [vehicles] = await Promise.all([
    clearOffersOnSoldVehicles().then(() =>
      prisma.vehicle.findMany({
        where: { listingPurpose: ListingPurpose.RENTAL },
        include: {
          dealer: { select: { name: true } },
          seasonOffer: true,
        },
        orderBy: { createdAt: "desc" },
      })
    ),
  ]);

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Vehicle Types" }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vehicle Types</h1>
          <p className="text-muted-foreground">
            {vehicles.length} templates · manage physical cars in Rental Fleet
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/fleet">Rental Fleet</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/vehicles/new"><Plus className="h-4 w-4" /> Add Vehicle Type</Link>
          </Button>
        </div>
      </div>
      <VehiclesTable
        vehicles={vehicles}
        canApprove={hasPermission(session.user.role, "vehicles:approve")}
        canManage={hasPermission(session.user.role, "vehicles:manage")}
        rentalOnly
      />
    </div>
  );
}
