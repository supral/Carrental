import type { Prisma } from "@prisma/client";
import type { MappedImportVehicle } from "./types";

export function mappedImportToVehicleData(
  data: MappedImportVehicle,
  dealerId: string,
  createdById: string,
  status: import("@prisma/client").VehicleStatus
): Prisma.VehicleCreateInput {
  return {
    title: data.title,
    vehicleNumber: data.vehicleNumber,
    make: data.make,
    model: data.model,
    year: data.year,
    price: data.price,
    mileage: data.mileage,
    fuelType: data.fuelType,
    transmission: data.transmission,
    bodyType: data.bodyType,
    category: data.category,
    listingPurpose: "SALE",
    condition: data.condition,
    color: data.color,
    doors: data.doors,
    seats: data.seats,
    driveType: data.driveType,
    location: data.location,
    description: data.description,
    features: data.features,
    details: data.details as object,
    status,
    featured: false,
    dealer: { connect: { id: dealerId } },
    createdBy: { connect: { id: createdById } },
    totalUnits: 1,
    availableUnits: 1,
    images: {
      create: data.imageUrls.map((url, order) => ({ url, order })),
    },
    customFields: {
      create: data.customFields.map((field, sortOrder) => ({
        name: field.name,
        value: field.value,
        sortOrder,
        group: field.group,
      })),
    },
  };
}

export function mappedImportToVehicleUpdateData(
  data: MappedImportVehicle,
  status: import("@prisma/client").VehicleStatus
): Prisma.VehicleUpdateInput {
  return {
    title: data.title,
    make: data.make,
    model: data.model,
    year: data.year,
    price: data.price,
    mileage: data.mileage,
    fuelType: data.fuelType,
    transmission: data.transmission,
    bodyType: data.bodyType,
    category: data.category,
    condition: data.condition,
    color: data.color,
    doors: data.doors,
    seats: data.seats,
    driveType: data.driveType,
    location: data.location,
    description: data.description,
    features: data.features,
    details: data.details as object,
    status,
    images: {
      create: data.imageUrls.map((url, order) => ({ url, order })),
    },
    customFields: {
      create: data.customFields.map((field, sortOrder) => ({
        name: field.name,
        value: field.value,
        sortOrder,
        group: field.group,
      })),
    },
  };
}
