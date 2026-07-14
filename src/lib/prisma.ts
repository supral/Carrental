import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Dev hot-reload can keep a Prisma client from before new models/fields were generated. */
function isStalePrismaClient(client: PrismaClient): boolean {
  const delegates = client as unknown as Record<string, unknown>;
  return (
    delegates.vehicleType == null ||
    delegates.rentalOption == null ||
    delegates.seasonOffer == null ||
    Prisma.VehicleScalarFieldEnum.isOnOffer == null ||
    Prisma.FleetVehicleScalarFieldEnum.make == null
  );
}

let prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV === "development" && isStalePrismaClient(prisma)) {
  prisma = createPrismaClient();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
