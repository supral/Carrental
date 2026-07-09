import {
  ListingPurpose,
  PrismaClient,
  VehicleCategory,
  VehicleStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const EVEREST_RENTAL_FLEET = [
  {
    title: "MG ZS or similar medium car",
    make: "MG",
    model: "ZS",
    year: 2024,
    price: 99,
    mileage: 12000,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    vehicleTypeName: "Intermediate SUV",
    seats: 5,
    luggage: 2,
    totalUnits: 3,
    image: "/images/fleet/mg-zs.png",
  },
  {
    title: "Toyota Prado GX or similar SUV",
    make: "Toyota",
    model: "Prado GX",
    year: 2023,
    price: 190,
    mileage: 28000,
    fuelType: "Diesel",
    transmission: "Manual",
    bodyType: "SUV",
    vehicleTypeName: "Fullsize SUV",
    seats: 5,
    luggage: 3,
    totalUnits: 2,
    image: "/images/fleet/toyota-prado-gx.png",
  },
] as const;

const FLEET_TITLES = EVEREST_RENTAL_FLEET.map((vehicle) => vehicle.title);

async function upsertVehicleType(name: string, sortOrder: number) {
  return prisma.vehicleType.upsert({
    where: { name },
    update: { active: true, sortOrder },
    create: {
      name,
      description: `${name} rental category`,
      sortOrder,
      active: true,
    },
  });
}

async function main() {
  const dealer = await prisma.dealer.findFirst({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (!dealer) {
    throw new Error("No approved dealer found. Run prisma db seed first.");
  }

  const intermediateSuv = await upsertVehicleType("Intermediate SUV", 0);
  const fullsizeSuv = await upsertVehicleType("Fullsize SUV", 1);

  let created = 0;
  let updated = 0;

  for (const vehicle of EVEREST_RENTAL_FLEET) {
    const vehicleTypeId =
      vehicle.vehicleTypeName === "Intermediate SUV" ? intermediateSuv.id : fullsizeSuv.id;

    const existing = await prisma.vehicle.findFirst({
      where: { title: vehicle.title, dealerId: dealer.id },
      include: { images: true },
    });

    const vehicleData = {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      mileage: vehicle.mileage,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      bodyType: vehicle.bodyType,
      vehicleTypeId,
      category: VehicleCategory.CARS,
      listingPurpose: ListingPurpose.RENTAL,
      status: VehicleStatus.ACTIVE,
      totalUnits: vehicle.totalUnits,
      availableUnits: vehicle.totalUnits,
      rentalAvailableFrom: new Date(),
      rentalAvailableTo: null,
      description: `${vehicle.make} ${vehicle.model} available for daily rental in Winnellie, Darwin.`,
      features: [
        "Air Conditioning",
        "Bluetooth",
        "Reverse Camera",
        `${vehicle.luggage} luggage`,
        `${vehicle.seats} passengers`,
      ],
      color: "White",
      doors: 5,
      seats: vehicle.seats,
      driveType: "AWD",
      location: "482 Stuart Hwy Winnellie NT 0820",
      dealerId: dealer.id,
    };

    if (existing) {
      await prisma.vehicle.update({
        where: { id: existing.id },
        data: vehicleData,
      });

      const primaryImage = existing.images.find((image) => image.order === 0);
      if (primaryImage) {
        await prisma.vehicleImage.update({
          where: { id: primaryImage.id },
          data: { url: vehicle.image },
        });
      } else {
        await prisma.vehicleImage.create({
          data: { vehicleId: existing.id, url: vehicle.image, order: 0 },
        });
      }

      updated += 1;
      console.log(`Updated: ${vehicle.title}`);
      continue;
    }

    await prisma.vehicle.create({
      data: {
        title: vehicle.title,
        ...vehicleData,
        images: {
          create: [{ url: vehicle.image, order: 0 }],
        },
      },
    });

    created += 1;
    console.log(`Created: ${vehicle.title}`);
  }

  const archived = await prisma.vehicle.updateMany({
    where: {
      listingPurpose: ListingPurpose.RENTAL,
      status: VehicleStatus.ACTIVE,
      title: { notIn: [...FLEET_TITLES] },
    },
    data: {
      status: VehicleStatus.DRAFT,
    },
  });

  console.log(`\nDone for ${dealer.name}. Created ${created}, updated ${updated}.`);
  console.log(`Archived ${archived.count} older rental vehicle(s) not in the Everest fleet.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
