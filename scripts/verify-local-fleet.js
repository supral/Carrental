process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5433/nb_automotive?schema=public";

const { PrismaClient } = require("@prisma/client");

async function main() {
  const p = new PrismaClient();
  try {
    const cols = await p.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'FleetVehicle'
        AND column_name IN ('make', 'model', 'year')
      ORDER BY column_name
    `);
    console.log("columns:", cols);

    const rows = await p.fleetVehicle.findMany({
      take: 1,
      select: { id: true, fleetNumber: true, make: true, model: true, year: true },
    });
    console.log("query ok:", rows);
  } finally {
    await p.$disconnect();
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
