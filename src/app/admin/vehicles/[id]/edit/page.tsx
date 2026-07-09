import { getFleetInventorySnapshot } from "@/lib/rentals/fleet-inventory";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ListingPurpose } from "@prisma/client";
import { mergeVehicleDetails } from "@/lib/vehicles/vehicle-details";
import { listVehicleTypes } from "@/lib/admin/vehicle-type-actions";
import { getRentalOptionsForVehicle } from "@/lib/admin/rental-option-actions";
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
      make: true,
      model: true,
      year: true,
      price: true,
      totalUnits: true,
      bodyType: true,
      vehicleTypeId: true,
      listingPurpose: true,
      description: true,
      features: true,
      details: true,
      rentalAvailableFrom: true,
      createdAt: true,
      seasonOffer: { select: { name: true, offerType: true } },
      templateValues: {
        include: { templateField: true },
      },
      customFields: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      vehicleRentalOptions: {
        where: { enabled: true },
        select: { rentalOptionId: true },
      },
    },
  });

  if (!vehicle) notFound();
  if (vehicle.listingPurpose === ListingPurpose.SALE) notFound();

  const [fleetSnapshot, vehicleTypes, rentalOptions] = await Promise.all([
    getFleetInventorySnapshot(vehicle.id),
    listVehicleTypes(),
    getRentalOptionsForVehicle(vehicle.id),
  ]);

  const templateValues = Object.fromEntries(
    vehicle.templateValues.map((row) => [row.templateFieldId, row.value ?? ""])
  );

  return (
    <EditRentalVehicleClient
      vehicle={{
        id: vehicle.id,
        title: vehicle.title,
        bodyType: vehicle.bodyType,
        vehicleTypeId: vehicle.vehicleTypeId,
        totalUnits: vehicle.totalUnits,
        listedSince: (vehicle.rentalAvailableFrom ?? vehicle.createdAt)?.toISOString() ?? null,
        vehicleDetails: mergeVehicleDetails(
          vehicle.details,
          vehicle.description,
          vehicle.features,
          vehicle.bodyType,
          "rental"
        ),
        selectedRentalOptionIds: vehicle.vehicleRentalOptions.map((row) => row.rentalOptionId),
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
      rentalOptions={rentalOptions}
    />
  );
}
