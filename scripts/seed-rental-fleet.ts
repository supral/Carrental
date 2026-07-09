import {
  ListingPurpose,
  PrismaClient,
  VehicleCategory,
  VehicleStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const RENTAL_FLEET = [
  {
    title: "2023 Toyota Camry Ascent",
    make: "Toyota",
    model: "Camry Ascent",
    year: 2023,
    price: 65,
    mileage: 18000,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "Sedan",
    totalUnits: 12,
    image: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80",
  },
  {
    title: "2022 Nissan X-Trail ST",
    make: "Nissan",
    model: "X-Trail ST",
    year: 2022,
    price: 75,
    mileage: 28000,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    totalUnits: 10,
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80",
  },
  {
    title: "2023 Hyundai Tucson Active",
    make: "Hyundai",
    model: "Tucson Active",
    year: 2023,
    price: 72,
    mileage: 15000,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    totalUnits: 11,
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
  },
  {
    title: "2021 Toyota Corolla Ascent Sport",
    make: "Toyota",
    model: "Corolla Ascent Sport",
    year: 2021,
    price: 55,
    mileage: 42000,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "Hatchback",
    totalUnits: 15,
    image: "https://images.unsplash.com/photo-1623869675781-12e04b303de3?w=800&q=80",
  },
  {
    title: "2023 Mitsubishi Outlander ES",
    make: "Mitsubishi",
    model: "Outlander ES",
    year: 2023,
    price: 80,
    mileage: 12000,
    fuelType: "Petrol",
    transmission: "Automatic",
    bodyType: "SUV",
    totalUnits: 10,
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
  },
] as const;

async function main() {
  const dealer = await prisma.dealer.findFirst({
    where: { email: "info@nbautomotive.com.au" },
    select: { id: true, name: true },
  });

  if (!dealer) {
    throw new Error("NB Automotive dealer not found. Run prisma db seed first.");
  }

  let created = 0;
  let updated = 0;

  for (const vehicle of RENTAL_FLEET) {
    const existing = await prisma.vehicle.findFirst({
      where: { title: vehicle.title, dealerId: dealer.id },
    });

    if (existing) {
      await prisma.vehicle.update({
        where: { id: existing.id },
        data: {
          listingPurpose: ListingPurpose.RENTAL,
          status: VehicleStatus.ACTIVE,
          totalUnits: vehicle.totalUnits,
          availableUnits: vehicle.totalUnits,
          rentalAvailableFrom: new Date(),
          price: vehicle.price,
        },
      });
      updated += 1;
      console.log(`Updated: ${vehicle.title} (${vehicle.totalUnits} units)`);
      continue;
    }

    await prisma.vehicle.create({
      data: {
        title: vehicle.title,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        mileage: vehicle.mileage,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        bodyType: vehicle.bodyType,
        category: VehicleCategory.CARS,
        listingPurpose: ListingPurpose.RENTAL,
        status: VehicleStatus.ACTIVE,
        totalUnits: vehicle.totalUnits,
        availableUnits: vehicle.totalUnits,
        rentalAvailableFrom: new Date(),
        description: `Reliable ${vehicle.make} ${vehicle.model} available for daily rental in Darwin.`,
        features: [
          "Air Conditioning",
          "Bluetooth",
          "Reverse Camera",
          "Cruise Control",
        ],
        color: "White",
        doors: 4,
        seats: 5,
        driveType: vehicle.bodyType === "SUV" ? "AWD" : "FWD",
        location: "Darwin, NT",
        dealerId: dealer.id,
        images: {
          create: [{ url: vehicle.image, order: 0 }],
        },
      },
    });

    created += 1;
    console.log(`Created: ${vehicle.title} (${vehicle.totalUnits} units)`);
  }

  console.log(`\nDone. Created ${created}, updated ${updated} rental vehicles for ${dealer.name}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
