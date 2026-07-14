import { getFleetInventorySnapshot } from "@/lib/rentals/fleet-inventory";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ListingPurpose } from "@prisma/client";
import { listVehicleTypes } from "@/lib/admin/vehicle-type-actions";
import EditRentalVehicleClient from "@/components/admin/EditRentalVehicleClient";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      price: true,
      features: true,
      vehicleTypeId: true,
      listingPurpose: true,
      images: { orderBy: { order: "asc" }, select: { url: true } },
      templateValues: {
        include: { templateField: true },
      },
      customFields: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!vehicle) notFound();
  if (vehicle.listingPurpose === ListingPurpose.SALE) notFound();

  const [fleetSnapshot, vehicleTypes] = await Promise.all([
    getFleetInventorySnapshot(vehicle.id),
    listVehicleTypes(),
  ]);

  const templateValues = Object.fromEntries(
    vehicle.templateValues.map((row) => [row.templateFieldId, row.value ?? ""])
  );

  return (
    <EditRentalVehicleClient
      vehicle={{
        id: vehicle.id,
        title: vehicle.title,
        price: vehicle.price,
        features: vehicle.features,
        imageUrls: vehicle.images.map((image) => image.url),
        vehicleTypeId: vehicle.vehicleTypeId,
        fleetSnapshot,
        templateValues,
        customFields: vehicle.customFields.map((field) => ({
          id: field.id,
          name: field.name,
          inputType: field.inputType,
          value: field.value ?? "",
          sortOrder: field.sortOrder,
          group: field.group,
        })),
      }}
      vehicleTypes={vehicleTypes.map((type) => ({ id: type.id, name: type.name }))}
    />
  );
}
