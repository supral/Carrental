-- Idempotent apply for digital rental agreement workflow

DO $$ BEGIN
  ALTER TYPE "RentalBookingStatus" ADD VALUE 'WAITING_FOR_CUSTOMER_FORM';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RentalBookingStatus" ADD VALUE 'WAITING_FOR_VEHICLE_ASSIGNMENT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RentalBookingStatus" ADD VALUE 'READY_FOR_PICKUP';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RentalBookingStatus" ADD VALUE 'RETURNED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RentalBookingStatus" ADD VALUE 'AWAITING_PAYMENT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RentalPaymentStatus" ADD VALUE 'PARTIAL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "RentalPaymentStatus" ADD VALUE 'PENDING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "FleetVehicle" ADD COLUMN IF NOT EXISTS "currentKm" INTEGER;
ALTER TABLE "FleetVehicle" ADD COLUMN IF NOT EXISTS "currentFuelLevel" TEXT;
ALTER TABLE "FleetVehicle" ADD COLUMN IF NOT EXISTS "fuelType" TEXT;
ALTER TABLE "FleetVehicle" ADD COLUMN IF NOT EXISTS "transmission" TEXT;
ALTER TABLE "FleetVehicle" ADD COLUMN IF NOT EXISTS "year" INTEGER;

UPDATE "FleetVehicle"
SET "currentKm" = "odometer"
WHERE "currentKm" IS NULL AND "odometer" IS NOT NULL;

ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "agreementToken" TEXT;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "agreementTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "customerFormCompletedAt" TIMESTAMP(3);
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "termsFlags" JSONB;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "kmOut" INTEGER;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "expectedKmIn" INTEGER;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "kmIn" INTEGER;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "fuelOut" TEXT;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "fuelIn" TEXT;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "dailyRateCents" INTEGER;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "dailyLimitKm" INTEGER;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "excessKmRateCents" INTEGER;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "bondCents" INTEGER;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "insuranceNotes" TEXT;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "timeOut" TIMESTAMP(3);
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "expectedReturnAt" TIMESTAMP(3);
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "returnedAt" TIMESTAMP(3);
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "lateReturn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "damageNotes" TEXT;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "damagePhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "accessoriesChecklist" JSONB;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "adminPickupSignatureUrl" TEXT;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "adminReturnSignatureUrl" TEXT;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "extraKmChargeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "fuelChargeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "lateFeeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "damageChargeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "outstandingBalanceCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "settlementPaidAt" TIMESTAMP(3);
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "agreementPdfUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RentalBooking_agreementToken_key" ON "RentalBooking"("agreementToken");

CREATE TABLE IF NOT EXISTS "RentalDriver" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "licenceNumber" TEXT,
    "licenceExpiry" TIMESTAMP(3),
    "licenceFrontUrl" TEXT,
    "licenceBackUrl" TEXT,
    "signatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RentalDriver_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RentalDriver_bookingId_idx" ON "RentalDriver"("bookingId");

DO $$ BEGIN
  ALTER TABLE "RentalDriver" ADD CONSTRAINT "RentalDriver_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "RentalBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "RentalDocument" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "customerSigned" BOOLEAN NOT NULL DEFAULT false,
    "adminSigned" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RentalDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RentalDocument_bookingId_idx" ON "RentalDocument"("bookingId");

DO $$ BEGIN
  ALTER TABLE "RentalDocument" ADD CONSTRAINT "RentalDocument_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "RentalBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "VehicleRentalHistory" (
    "id" TEXT NOT NULL,
    "fleetVehicleId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerName" TEXT,
    "pickupAt" TIMESTAMP(3),
    "returnAt" TIMESTAMP(3),
    "kmOut" INTEGER,
    "kmIn" INTEGER,
    "damageNotes" TEXT,
    "totalChargesCents" INTEGER NOT NULL DEFAULT 0,
    "agreementPdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleRentalHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VehicleRentalHistory_fleetVehicleId_idx" ON "VehicleRentalHistory"("fleetVehicleId");
CREATE INDEX IF NOT EXISTS "VehicleRentalHistory_bookingId_idx" ON "VehicleRentalHistory"("bookingId");

DO $$ BEGIN
  ALTER TABLE "VehicleRentalHistory" ADD CONSTRAINT "VehicleRentalHistory_fleetVehicleId_fkey"
    FOREIGN KEY ("fleetVehicleId") REFERENCES "FleetVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VehicleRentalHistory" ADD CONSTRAINT "VehicleRentalHistory_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "RentalBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
