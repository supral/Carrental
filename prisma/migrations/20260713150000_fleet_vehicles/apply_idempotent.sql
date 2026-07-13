-- Idempotent fleet vehicles migration for local / already-partial DBs

DO $$ BEGIN
  CREATE TYPE "FleetVehicleStatus" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FleetVehicle" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fleetNumber" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "vinNumber" TEXT,
    "engineNumber" TEXT,
    "odometer" INTEGER,
    "color" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseCostCents" INTEGER,
    "branch" TEXT,
    "status" "FleetVehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetVehicle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "fleetVehicleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "FleetVehicle_fleetNumber_key" ON "FleetVehicle"("fleetNumber");
CREATE INDEX IF NOT EXISTS "FleetVehicle_vehicleId_idx" ON "FleetVehicle"("vehicleId");
CREATE INDEX IF NOT EXISTS "FleetVehicle_status_idx" ON "FleetVehicle"("status");
CREATE INDEX IF NOT EXISTS "FleetVehicle_registrationNumber_idx" ON "FleetVehicle"("registrationNumber");
CREATE INDEX IF NOT EXISTS "RentalBooking_fleetVehicleId_idx" ON "RentalBooking"("fleetVehicleId");

DO $$ BEGIN
  ALTER TABLE "FleetVehicle"
    ADD CONSTRAINT "FleetVehicle_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RentalBooking"
    ADD CONSTRAINT "RentalBooking_fleetVehicleId_fkey"
    FOREIGN KEY ("fleetVehicleId") REFERENCES "FleetVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "FleetVehicle" (
  "id",
  "vehicleId",
  "fleetNumber",
  "color",
  "branch",
  "status",
  "notes",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(v."id" || '-' || gs.n::text),
  v."id",
  COALESCE(
    NULLIF(TRIM(v."vehicleNumber"), ''),
    UPPER(LEFT(REGEXP_REPLACE(COALESCE(v."make", 'CAR'), '[^A-Za-z0-9]', '', 'g'), 3))
      || UPPER(LEFT(REGEXP_REPLACE(COALESCE(v."model", 'X'), '[^A-Za-z0-9]', '', 'g'), 3))
      || '-' || LEFT(v."id", 4)
  ) || '-' || LPAD(gs.n::text, 3, '0'),
  v."color",
  v."location",
  'AVAILABLE'::"FleetVehicleStatus",
  'Migrated from fleet unit count',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Vehicle" v
CROSS JOIN LATERAL generate_series(1, GREATEST(v."totalUnits", 1)) AS gs(n)
WHERE v."listingPurpose" = 'RENTAL'
  AND NOT EXISTS (
    SELECT 1 FROM "FleetVehicle" fv WHERE fv."vehicleId" = v."id"
  );
