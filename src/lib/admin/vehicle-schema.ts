import { VehicleCategory, VehicleStatus } from "@prisma/client";
import { z } from "zod";
import {
  detailsToLegacyFields,
  type VehicleDetailsDocument,
} from "@/lib/vehicles/vehicle-details";

export const ListingPurpose = {
  SALE: "SALE",
  RENTAL: "RENTAL",
} as const;

export type ListingPurpose = (typeof ListingPurpose)[keyof typeof ListingPurpose];

export const LISTING_PURPOSE_LABELS: Record<ListingPurpose, string> = {
  SALE: "For Sale",
  RENTAL: "For Rental",
};

export const createVehicleSchema = z.object({
  listingPurpose: z.enum([ListingPurpose.SALE, ListingPurpose.RENTAL]),
  title: z.string().min(3, "Title must be at least 3 characters"),
  vehicleNumber: z.string(),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  price: z.number().int().min(0, "Price must be positive"),
  mileage: z.number().int().min(0),
  fuelType: z.string().min(1, "Fuel type is required"),
  transmission: z.string().min(1, "Transmission is required"),
  bodyType: z.string().min(1, "Body type is required"),
  category: z.nativeEnum(VehicleCategory),
  condition: z.string().min(1, "Condition is required"),
  color: z.string().optional(),
  doors: z.string().optional(),
  seats: z.string().optional(),
  driveType: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  status: z.nativeEnum(VehicleStatus),
  featured: z.boolean(),
  totalUnits: z.number().int().min(0).optional(),
  vehicleTypeId: z.string().optional(),
  dealerId: z.string().min(1, "Dealer is required"),
  imageUrls: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.listingPurpose === ListingPurpose.SALE) {
    if (!data.vehicleNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vehicle number is required",
        path: ["vehicleNumber"],
      });
    }
  }
});

export type CreateVehicleFormValues = z.infer<typeof createVehicleSchema>;

export function collectImageUrls(imageUrlsText: string | undefined, uploadedUrls: string[] = []) {
  const fromText = (imageUrlsText || "")
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean);

  return [...uploadedUrls, ...fromText];
}

export function parseVehicleForm(
  values: CreateVehicleFormValues,
  uploadedUrls: string[] = [],
  vehicleDetails?: VehicleDetailsDocument
) {
  const imageUrls = collectImageUrls(values.imageUrls, uploadedUrls);

  if (imageUrls.length === 0) {
    throw new Error("At least one image URL is required");
  }

  const details = vehicleDetails ?? { sections: [] };
  const legacy = detailsToLegacyFields(details);

  return {
    title: values.title.trim(),
    vehicleNumber:
      values.listingPurpose === ListingPurpose.SALE
        ? values.vehicleNumber!.trim().toUpperCase()
        : null,
    make: values.make.trim(),
    model: values.model.trim(),
    year: values.year,
    price: values.price,
    mileage: values.mileage,
    fuelType: values.fuelType,
    transmission: values.transmission,
    bodyType: values.bodyType,
    vehicleTypeId: values.vehicleTypeId?.trim() || null,
    category: values.category,
    listingPurpose: values.listingPurpose,
    condition: values.condition,
    color: values.color?.trim() || null,
    doors: values.doors?.trim() ? Number(values.doors) : null,
    seats: values.seats?.trim() ? Number(values.seats) : null,
    driveType: values.driveType?.trim() || null,
    location: values.location.trim(),
    description: legacy.description,
    features: legacy.features,
    details,
    status: values.status,
    featured: values.featured,
    totalUnits: values.listingPurpose === ListingPurpose.RENTAL ? (values.totalUnits ?? 0) : 1,
    dealerId: values.dealerId,
    imageUrls,
    rentalAvailableFrom: values.listingPurpose === ListingPurpose.RENTAL ? new Date() : null,
    rentalAvailableTo: null,
  };
}
