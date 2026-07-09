import { PrismaClient, Role, VehicleStatus, DealerStatus, VehicleCategory, LeadStatus, LeadType, ContentStatus, NotificationType, TemplateFieldInputType, ListingPurpose } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 12);

  const dealer = await prisma.dealer.upsert({
    where: { email: "info@nbautomotive.com.au" },
    update: {
      slug: "nb-automotive",
      tagline: "Best Car Dealership in Darwin",
      primaryColor: "#dc2626",
    },
    create: {
      name: "NB Automotive",
      slug: "nb-automotive",
      email: "info@nbautomotive.com.au",
      phone: "08 8947 0556",
      address: "123 Stuart Highway, Darwin NT 0800",
      description: "Darwin's premier car dealership",
      tagline: "Best Car Dealership in Darwin",
      primaryColor: "#dc2626",
      verified: true,
      status: DealerStatus.APPROVED,
      rating: 4.8,
      totalSales: 156,
    },
  });

  const users = [
    { email: "superadmin@nbautomotive.com.au", name: "Super Admin", role: Role.SUPER_ADMIN },
    { email: "admin@nbautomotive.com.au", name: "Admin User", role: Role.ADMIN },
    { email: "dealer@nbautomotive.com.au", name: "Dealer Manager", role: Role.DEALER_MANAGER, dealerId: dealer.id },
    { email: "content@nbautomotive.com.au", name: "Content Manager", role: Role.CONTENT_MANAGER },
    { email: "support@nbautomotive.com.au", name: "Support Agent", role: Role.SUPPORT_AGENT },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: { ...u, passwordHash },
    });
  }

  const vehicleData = [
    { title: "2023 Toyota Hilux SR5", make: "Toyota", model: "Hilux SR5", year: 2023, price: 58990, mileage: 18500, fuelType: "Diesel", transmission: "Automatic", bodyType: "Ute", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, featured: true },
    { title: "2022 Ford Ranger Wildtrak", make: "Ford", model: "Ranger Wildtrak", year: 2022, price: 64990, mileage: 32000, fuelType: "Diesel", transmission: "Automatic", bodyType: "Ute", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, featured: true },
    { title: "2024 Mazda CX-5 GT", make: "Mazda", model: "CX-5 GT", year: 2024, price: 42990, mileage: 8500, fuelType: "Petrol", transmission: "Automatic", bodyType: "SUV", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, featured: true },
    { title: "2021 Mitsubishi Triton GLS", make: "Mitsubishi", model: "Triton GLS", year: 2021, price: 38990, mileage: 45000, fuelType: "Diesel", transmission: "Manual", bodyType: "Ute", category: VehicleCategory.CARS, status: VehicleStatus.PENDING },
  ];

  for (const v of vehicleData) {
    const existing = await prisma.vehicle.findFirst({ where: { title: v.title } });
    if (!existing) {
        await prisma.vehicle.create({
          data: {
            ...v,
            listingPurpose: ListingPurpose.SALE,
            description: `Quality ${v.make} ${v.model} available at NB Automotive Darwin.`,
            features: ["Air Conditioning", "Bluetooth", "Reverse Camera"],
            color: "White",
            doors: 4,
            seats: 5,
            driveType: "4WD",
            location: "Darwin, NT",
            dealerId: dealer.id,
            images: {
              create: [{ url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80", order: 0 }],
            },
          },
        });
      }
    }

  const rentalVehicleData = [
    { title: "2023 Toyota RAV4 GX", make: "Toyota", model: "RAV4 GX", year: 2023, price: 89, mileage: 22000, fuelType: "Petrol", transmission: "Automatic", bodyType: "SUV", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, totalUnits: 3, availableUnits: 3 },
    { title: "2022 Mazda CX-5 Maxx", make: "Mazda", model: "CX-5 Maxx", year: 2022, price: 79, mileage: 35000, fuelType: "Petrol", transmission: "Automatic", bodyType: "SUV", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, totalUnits: 2, availableUnits: 2 },
    { title: "2023 Toyota Camry Ascent", make: "Toyota", model: "Camry Ascent", year: 2023, price: 65, mileage: 18000, fuelType: "Petrol", transmission: "Automatic", bodyType: "Sedan", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, totalUnits: 12, availableUnits: 12 },
    { title: "2022 Nissan X-Trail ST", make: "Nissan", model: "X-Trail ST", year: 2022, price: 75, mileage: 28000, fuelType: "Petrol", transmission: "Automatic", bodyType: "SUV", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, totalUnits: 10, availableUnits: 10 },
    { title: "2023 Hyundai Tucson Active", make: "Hyundai", model: "Tucson Active", year: 2023, price: 72, mileage: 15000, fuelType: "Petrol", transmission: "Automatic", bodyType: "SUV", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, totalUnits: 11, availableUnits: 11 },
    { title: "2021 Toyota Corolla Ascent Sport", make: "Toyota", model: "Corolla Ascent Sport", year: 2021, price: 55, mileage: 42000, fuelType: "Petrol", transmission: "Automatic", bodyType: "Hatchback", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, totalUnits: 15, availableUnits: 15 },
    { title: "2023 Mitsubishi Outlander ES", make: "Mitsubishi", model: "Outlander ES", year: 2023, price: 80, mileage: 12000, fuelType: "Petrol", transmission: "Automatic", bodyType: "SUV", category: VehicleCategory.CARS, status: VehicleStatus.ACTIVE, totalUnits: 10, availableUnits: 10 },
  ];

  for (const v of rentalVehicleData) {
    const existing = await prisma.vehicle.findFirst({ where: { title: v.title } });
    if (!existing) {
      await prisma.vehicle.create({
        data: {
          ...v,
          listingPurpose: ListingPurpose.RENTAL,
          rentalAvailableFrom: new Date(),
          description: `Reliable ${v.make} ${v.model} available for daily rental in Darwin.`,
          features: ["Air Conditioning", "Bluetooth", "Reverse Camera", "Cruise Control"],
          color: "White",
          doors: 4,
          seats: 5,
          driveType: "AWD",
          location: "Darwin, NT",
          dealerId: dealer.id,
          images: {
            create: [{ url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80", order: 0 }],
          },
        },
      });
    }
  }

  await prisma.lead.createMany({
    data: [
      { type: LeadType.VEHICLE_ENQUIRY, status: LeadStatus.NEW, name: "John Smith", email: "john@email.com", phone: "0412345678", message: "Interested in the Hilux", dealerId: dealer.id },
      { type: LeadType.CONTACT, status: LeadStatus.ASSIGNED, name: "Sarah Lee", email: "sarah@email.com", phone: "0423456789", message: "General enquiry about finance", dealerId: dealer.id },
      { type: LeadType.VEHICLE_ENQUIRY, status: LeadStatus.NEW, name: "Mike Brown", email: "mike@email.com", message: "Interested in Ranger Wildtrak pricing" },
    ],
    skipDuplicates: true,
  });

  await prisma.banner.upsert({
    where: { id: "seed-banner-1" },
    update: {},
    create: {
      id: "seed-banner-1",
      title: "Summer Sale",
      subtitle: "Best deals on utes in Darwin",
      imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80",
      linkUrl: "/vehicles",
      status: ContentStatus.PUBLISHED,
      order: 0,
    },
  });

  await prisma.fAQ.createMany({
    data: [
      { question: "Do you offer finance?", answer: "Yes, we offer flexible finance options for all vehicles.", order: 0 },
      { question: "Can I trade in my car?", answer: "Absolutely. We provide fair trade-in valuations.", order: 1 },
    ],
    skipDuplicates: true,
  });

  await prisma.siteSetting.upsert({
    where: { key: "branding" },
    update: {},
    create: {
      key: "branding",
      value: { siteName: "NB Automotive", primaryColor: "#f97316", tagline: "Best Car Dealership in Darwin" },
    },
  });

  const superAdmin = await prisma.user.findUnique({ where: { email: "superadmin@nbautomotive.com.au" } });
  if (superAdmin) {
    await prisma.notification.createMany({
      data: [
        { userId: superAdmin.id, type: NotificationType.APPROVAL_REQUEST, title: "Pending Listing", message: "Mitsubishi Triton awaiting approval", link: "/admin/moderation" },
        { userId: superAdmin.id, type: NotificationType.NEW_LEAD, title: "New Lead", message: "John Smith enquired about Hilux", link: "/admin/leads" },
        { userId: superAdmin.id, type: NotificationType.NEW_DEALER, title: "Dealer Registration", message: "New dealer application received", link: "/admin/dealers" },
      ],
      skipDuplicates: true,
    });
  }

  console.log("Seeding vehicle types and rental options...");

  const vehicleTypeSeeds = [
    {
      name: "SUV",
      description: "Sport utility vehicles",
      fields: [
        { name: "Ground Clearance", inputType: TemplateFieldInputType.NUMBER, group: "Specifications", defaultValue: "200mm" },
        { name: "Fuel Tank", inputType: TemplateFieldInputType.NUMBER, group: "Specifications", defaultValue: "55L" },
        { name: "Drive Type", inputType: TemplateFieldInputType.TEXT, group: "Specifications", defaultValue: "AWD" },
        { name: "Cargo Capacity", inputType: TemplateFieldInputType.TEXT, group: "Specifications", defaultValue: "580L" },
        { name: "Wheelbase", inputType: TemplateFieldInputType.NUMBER, group: "Specifications", defaultValue: "2,700mm" },
      ],
    },
    {
      name: "Sedan",
      description: "Passenger sedans",
      fields: [
        { name: "Boot Space", inputType: TemplateFieldInputType.TEXT, group: "Specifications" },
        { name: "Engine", inputType: TemplateFieldInputType.TEXT, group: "Specifications" },
        { name: "Transmission", inputType: TemplateFieldInputType.TEXT, group: "Vehicle Details" },
        { name: "Fuel Economy", inputType: TemplateFieldInputType.TEXT, group: "Vehicle Details" },
        { name: "Airbags", inputType: TemplateFieldInputType.NUMBER, group: "Vehicle Details" },
      ],
    },
    {
      name: "Electric",
      description: "Battery electric vehicles",
      fields: [
        { name: "Battery Capacity", inputType: TemplateFieldInputType.TEXT, group: "Specifications" },
        { name: "Charging Time", inputType: TemplateFieldInputType.TEXT, group: "Specifications" },
        { name: "Range", inputType: TemplateFieldInputType.TEXT, group: "Specifications" },
        { name: "Motor Power", inputType: TemplateFieldInputType.TEXT, group: "Specifications" },
      ],
    },
  ];

  for (const [index, seed] of vehicleTypeSeeds.entries()) {
    const type = await prisma.vehicleType.upsert({
      where: { name: seed.name },
      update: { description: seed.description, sortOrder: index },
      create: {
        name: seed.name,
        description: seed.description,
        sortOrder: index,
      },
    });

    for (const [fieldIndex, field] of seed.fields.entries()) {
      const existing = await prisma.vehicleTemplateField.findFirst({
        where: { vehicleTypeId: type.id, name: field.name },
      });
      const fieldData = {
        name: field.name,
        inputType: field.inputType,
        sortOrder: fieldIndex,
        group: field.group,
        defaultValue: "defaultValue" in field ? String(field.defaultValue) : null,
      };
      if (!existing) {
        await prisma.vehicleTemplateField.create({
          data: { vehicleTypeId: type.id, ...fieldData },
        });
      } else if (fieldData.defaultValue) {
        await prisma.vehicleTemplateField.update({
          where: { id: existing.id },
          data: { defaultValue: fieldData.defaultValue },
        });
      }
    }
  }

  const rentalOptionSeeds = [
    { name: "Standard Damage Cover", category: "INSURANCE" as const, price: 25, description: "Protects against accidental vehicle damage." },
    { name: "Theft Protection", category: "PROTECTION" as const, price: 15, description: "Protects against vehicle theft." },
    { name: "Baby Seat", category: "ACCESSORY" as const, price: 12, description: "Rear-facing baby seat for infants.", supportsQuantity: true, maxQuantity: 2 },
    { name: "GPS Navigation", category: "ACCESSORY" as const, price: 10, description: "Portable GPS navigation device." },
    { name: "Additional Driver", category: "EXTRA" as const, price: 8, description: "Add another authorised driver to the rental." },
    { name: "Unlimited Mileage", category: "EXTRA" as const, price: 20, description: "Drive without daily kilometre limits.", priceType: "PER_RENTAL" as const },
  ];

  for (const [index, option] of rentalOptionSeeds.entries()) {
    const existing = await prisma.rentalOption.findFirst({ where: { name: option.name } });
    if (!existing) {
      await prisma.rentalOption.create({
        data: {
          name: option.name,
          category: option.category,
          price: option.price,
          description: option.description,
          sortOrder: index,
          supportsQuantity: option.supportsQuantity ?? false,
          maxQuantity: option.maxQuantity ?? null,
          priceType: option.priceType ?? "PER_DAY",
          active: true,
        },
      });
    }
  }

  console.log("Seed completed!");
  if (process.env.NODE_ENV !== "production") {
    console.log("Dev login: superadmin@nbautomotive.com.au / admin123");
    console.log("Change all passwords before client handoff.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
