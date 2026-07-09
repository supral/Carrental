import { prisma } from "@/lib/prisma";
import { ListingPurpose, Prisma, VehicleStatus } from "@prisma/client";
import type { FilterOptions, Vehicle, VehicleSearchParams } from "@/types";
import { mergeVehicleDetails } from "@/lib/vehicles/vehicle-details";
import type { VehicleSpecGroup } from "@/lib/vehicles/vehicle-specs-service";
import {
  resolveVehicleOffer,
} from "@/lib/vehicles/vehicle-offers";
import { expireStaleVehicleOffers } from "@/lib/vehicles/vehicle-offers-server";

const vehicleInclude = {
  dealer: { select: { name: true, phone: true } },
  images: { orderBy: { order: "asc" as const } },
  vehicleType: { select: { id: true, name: true } },
  seasonOffer: true,
};

type DbVehicle = Prisma.VehicleGetPayload<{ include: typeof vehicleInclude }>;

export function mapDbVehicleToPublic(
  vehicle: DbVehicle,
  specGroups?: VehicleSpecGroup[]
): Vehicle {
  const images = vehicle.images.map((image) => image.url);
  const listingPurpose = vehicle.listingPurpose === ListingPurpose.RENTAL ? "rental" : "sale";
  const offer = resolveVehicleOffer(vehicle);

  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vehicleNumber:
      listingPurpose === "sale" ? vehicle.vehicleNumber || undefined : undefined,
    price: vehicle.price,
    mileage: vehicle.mileage,
    fuelType: vehicle.fuelType as Vehicle["fuelType"],
    transmission: vehicle.transmission as Vehicle["transmission"],
    bodyType: vehicle.bodyType as Vehicle["bodyType"],
    category: "cars",
    listingPurpose,
    condition: vehicle.condition as Vehicle["condition"],
    color: vehicle.color || "White",
    doors: vehicle.doors ?? 4,
    seats: vehicle.seats ?? 5,
    driveType: (vehicle.driveType || "AWD") as Vehicle["driveType"],
    location: vehicle.location,
    dealer: {
      name: vehicle.dealer.name,
      phone: vehicle.dealer.phone || "08 8947 0556",
    },
    image: images[0] || "/images/everest-logo-stacked.png",
    images,
    description: vehicle.description,
    features: vehicle.features,
    details: mergeVehicleDetails(
      vehicle.details,
      vehicle.description,
      vehicle.features,
      vehicle.bodyType,
      listingPurpose
    ),
    featured: vehicle.featured,
    totalUnits: vehicle.totalUnits ?? 1,
    availableUnits: vehicle.availableUnits ?? vehicle.totalUnits ?? 1,
    vehicleTypeId: vehicle.vehicleTypeId ?? undefined,
    vehicleTypeName: vehicle.vehicleType?.name,
    specGroups,
    rentalAvailableFrom: vehicle.rentalAvailableFrom?.toISOString(),
    rentalAvailableTo: vehicle.rentalAvailableTo?.toISOString(),
    offer,
  };
}

function buildWhere(query: VehicleSearchParams & { featured?: boolean }): Prisma.VehicleWhereInput {
  const listingPurpose =
    query.listingPurpose === "rental"
      ? ListingPurpose.RENTAL
      : query.listingPurpose === "sale"
        ? ListingPurpose.SALE
        : ListingPurpose.SALE;

  const where: Prisma.VehicleWhereInput = {
    status: VehicleStatus.ACTIVE,
    listingPurpose,
  };

  if (query.featured) where.featured = true;
  if (query.make) where.make = { in: query.make.split(",") };
  if (query.model) where.model = query.model;
  if (query.minPrice || query.maxPrice) {
    where.price = {};
    if (query.minPrice) where.price.gte = Number(query.minPrice);
    if (query.maxPrice) where.price.lte = Number(query.maxPrice);
  }
  if (query.minYear || query.maxYear) {
    where.year = {};
    if (query.minYear) where.year.gte = Number(query.minYear);
    if (query.maxYear) where.year.lte = Number(query.maxYear);
  }
  if (query.minKm || query.maxKm) {
    where.mileage = {};
    if (query.minKm) where.mileage.gte = Number(query.minKm);
    if (query.maxKm) where.mileage.lte = Number(query.maxKm);
  }
  if (query.fuelType) where.fuelType = query.fuelType;
  if (query.transmission) where.transmission = query.transmission;
  if (query.bodyType) where.bodyType = query.bodyType;
  if (query.condition) where.condition = query.condition;
  if (query.color) where.color = query.color;
  if (query.driveType) where.driveType = query.driveType;
  if (query.doors) where.doors = Number(query.doors);
  if (query.seats) where.seats = Number(query.seats);
  if (query.location) where.location = query.location;
  if (query.dealerId) where.dealerId = query.dealerId;
  if (query.search) {
    where.OR = [
      { make: { contains: query.search, mode: "insensitive" } },
      { model: { contains: query.search, mode: "insensitive" } },
      { title: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const offersOnly = query.offersOnly === true || query.offersOnly === "true";
  if (offersOnly) {
    const now = new Date();
    where.seasonOfferId = { not: null };
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        seasonOffer: {
          isEnabled: true,
          OR: [{ offerEndDate: null }, { offerEndDate: { gte: now } }],
          AND: [
            {
              OR: [{ offerStartDate: null }, { offerStartDate: { lte: now } }],
            },
          ],
        },
      },
    ];
  }

  return where;
}

function buildOrderBy(sort?: string): Prisma.VehicleOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { price: "asc" };
    case "price-desc":
      return { price: "desc" };
    case "km-asc":
      return { mileage: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

function sortVehicles(vehicles: Vehicle[], sort?: string) {
  const copy = [...vehicles];
  const displayPrice = (vehicle: Vehicle) => vehicle.offer?.displayPrice ?? vehicle.price;
  const savingsAmount = (vehicle: Vehicle) => vehicle.offer?.savingsAmount ?? 0;

  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => displayPrice(a) - displayPrice(b));
    case "price-desc":
      return copy.sort((a, b) => displayPrice(b) - displayPrice(a));
    case "discount-desc":
      return copy.sort((a, b) => savingsAmount(b) - savingsAmount(a));
    case "km-asc":
      return copy.sort((a, b) => a.mileage - b.mileage);
    default:
      return copy;
  }
}

export async function getPublicVehicles(query: VehicleSearchParams = {}) {
  await expireStaleVehicleOffers();

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 9;
  const where = buildWhere(query);
  const needsInMemorySort =
    query.sort === "price-asc" ||
    query.sort === "price-desc" ||
    query.sort === "discount-desc";

  if (needsInMemorySort) {
    const rows = await prisma.vehicle.findMany({
      where,
      include: vehicleInclude,
      orderBy: { createdAt: "desc" },
    });

    const mapped = sortVehicles(
      rows.map((row) => mapDbVehicleToPublic(row)),
      query.sort
    );
    const total = mapped.length;
    const start = (page - 1) * limit;
    const data = mapped.slice(start, start + limit);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data,
      total,
      page: Math.min(page, totalPages),
      limit,
      totalPages,
    };
  }

  const [total, rows] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      include: vehicleInclude,
      orderBy: buildOrderBy(query.sort),
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: rows.map((row) => mapDbVehicleToPublic(row)),
    total,
    page: Math.min(page, totalPages),
    limit,
    totalPages,
  };
}

export async function getPublicVehicleById(id: string) {
  await expireStaleVehicleOffers();

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, status: VehicleStatus.ACTIVE },
    include: vehicleInclude,
  });

  if (!vehicle) return null;
  const { getVehicleSpecGroups } = await import("@/lib/vehicles/vehicle-specs-service");
  const specGroups = await getVehicleSpecGroups(vehicle.id);
  return mapDbVehicleToPublic(vehicle, specGroups);
}

export async function getPublicRentalVehicleById(id: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id,
      status: VehicleStatus.ACTIVE,
      listingPurpose: ListingPurpose.RENTAL,
    },
    include: vehicleInclude,
  });

  if (!vehicle) return null;
  const { getVehicleSpecGroups } = await import("@/lib/vehicles/vehicle-specs-service");
  const specGroups = await getVehicleSpecGroups(vehicle.id);
  return mapDbVehicleToPublic(vehicle, specGroups);
}

export async function getFeaturedPublicVehicles(
  listingPurpose: "sale" | "rental" = "sale",
  dealerId?: string
) {
  await expireStaleVehicleOffers();

  const rows = await prisma.vehicle.findMany({
    where: {
      status: VehicleStatus.ACTIVE,
      listingPurpose: listingPurpose === "rental" ? ListingPurpose.RENTAL : ListingPurpose.SALE,
      featured: true,
      ...(dealerId ? { dealerId } : {}),
    },
    include: vehicleInclude,
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (rows.length === 0 && dealerId) {
    const fallback = await prisma.vehicle.findMany({
      where: {
        status: VehicleStatus.ACTIVE,
        listingPurpose: ListingPurpose.SALE,
        dealerId,
      },
      include: vehicleInclude,
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    return fallback.map((row) => mapDbVehicleToPublic(row));
  }

  return rows.map((row) => mapDbVehicleToPublic(row));
}

export async function getPublicVehiclesByIds(ids: string[]) {
  const rows = await prisma.vehicle.findMany({
    where: { id: { in: ids }, status: VehicleStatus.ACTIVE },
    include: vehicleInclude,
  });

  const mapped = new Map(rows.map((row) => [row.id, mapDbVehicleToPublic(row)]));
  return ids.map((id) => mapped.get(id)).filter((vehicle): vehicle is Vehicle => !!vehicle);
}

export async function getPublicFilterOptions(listingPurpose: "sale" | "rental" = "sale") {
  const rows = await prisma.vehicle.findMany({
    where: {
      status: VehicleStatus.ACTIVE,
      listingPurpose: listingPurpose === "rental" ? ListingPurpose.RENTAL : ListingPurpose.SALE,
    },
    select: {
      make: true,
      model: true,
      fuelType: true,
      transmission: true,
      bodyType: true,
      condition: true,
      color: true,
      driveType: true,
      doors: true,
      seats: true,
      features: true,
      location: true,
      year: true,
      price: true,
      mileage: true,
    },
  });

  if (rows.length === 0) {
    return {
      makes: [],
      models: {},
      fuelTypes: [],
      transmissions: [],
      bodyTypes: [],
      conditions: [],
      colors: [],
      driveTypes: [],
      doors: [],
      seats: [],
      features: [],
      locations: [],
      years: [],
      priceRange: { min: 0, max: 0 },
      kmRange: { min: 0, max: 0 },
    } satisfies FilterOptions;
  }

  const makes = [...new Set(rows.map((row) => row.make))].sort();
  const models: Record<string, string[]> = {};
  makes.forEach((make) => {
    models[make] = [...new Set(rows.filter((row) => row.make === make).map((row) => row.model))].sort();
  });

  return {
    makes,
    models,
    fuelTypes: [...new Set(rows.map((row) => row.fuelType))].sort(),
    transmissions: [...new Set(rows.map((row) => row.transmission))].sort(),
    bodyTypes: [...new Set(rows.map((row) => row.bodyType))].sort(),
    conditions: [...new Set(rows.map((row) => row.condition))].sort(),
    colors: [...new Set(rows.map((row) => row.color).filter(Boolean) as string[])].sort(),
    driveTypes: [...new Set(rows.map((row) => row.driveType).filter(Boolean) as string[])].sort(),
    doors: [...new Set(rows.map((row) => row.doors).filter((value): value is number => value != null))].sort(
      (a, b) => a - b
    ),
    seats: [...new Set(rows.map((row) => row.seats).filter((value): value is number => value != null))].sort(
      (a, b) => a - b
    ),
    features: [...new Set(rows.flatMap((row) => row.features))].sort(),
    locations: [...new Set(rows.map((row) => row.location))].sort(),
    years: [...new Set(rows.map((row) => row.year))].sort((a, b) => b - a),
    priceRange: {
      min: Math.min(...rows.map((row) => row.price)),
      max: Math.max(...rows.map((row) => row.price)),
    },
    kmRange: {
      min: Math.min(...rows.map((row) => row.mileage)),
      max: Math.max(...rows.map((row) => row.mileage)),
    },
  } satisfies FilterOptions;
}

const rentalFleetSelect = {
  id: true,
  make: true,
  model: true,
  year: true,
  price: true,
  mileage: true,
  fuelType: true,
  transmission: true,
  bodyType: true,
  condition: true,
  color: true,
  doors: true,
  seats: true,
  driveType: true,
  location: true,
  totalUnits: true,
  availableUnits: true,
  vehicleType: { select: { name: true } },
  images: { orderBy: { order: "asc" as const }, take: 1, select: { url: true } },
} satisfies Prisma.VehicleSelect;

type RentalFleetRow = Prisma.VehicleGetPayload<{ select: typeof rentalFleetSelect }>;

function mapRentalFleetRow(vehicle: RentalFleetRow): Vehicle {
  const image = vehicle.images[0]?.url || "/images/fleet/mg-zs.png";

  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    price: vehicle.price,
    mileage: vehicle.mileage,
    fuelType: vehicle.fuelType as Vehicle["fuelType"],
    transmission: vehicle.transmission as Vehicle["transmission"],
    bodyType: vehicle.bodyType as Vehicle["bodyType"],
    category: "cars",
    listingPurpose: "rental",
    condition: vehicle.condition as Vehicle["condition"],
    color: vehicle.color || "White",
    doors: vehicle.doors ?? 4,
    seats: vehicle.seats ?? 5,
    driveType: (vehicle.driveType || "AWD") as Vehicle["driveType"],
    location: vehicle.location,
    dealer: { name: "Everest Car Rental", phone: "0411 528 466" },
    image,
    images: image ? [image] : [],
    description: "",
    features: [],
    totalUnits: vehicle.totalUnits ?? 1,
    availableUnits: vehicle.availableUnits ?? vehicle.totalUnits ?? 1,
    vehicleTypeName: vehicle.vehicleType?.name,
  };
}

export async function getAvailableRentalFleet() {
  const rows = await prisma.vehicle.findMany({
    where: {
      status: VehicleStatus.ACTIVE,
      listingPurpose: ListingPurpose.RENTAL,
      availableUnits: { gt: 0 },
    },
    select: rentalFleetSelect,
    orderBy: { price: "asc" },
  });

  return rows.map(mapRentalFleetRow);
}
