-- CreateEnum
CREATE TYPE "VehicleInventoryStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'RENTED', 'SOLD');

-- CreateEnum
CREATE TYPE "SaleBookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'MEETING_SCHEDULED', 'DEAL_FINALIZED', 'PAID', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalePaymentStatus" AS ENUM ('UNPAID', 'PAID', 'FAILED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SALE_BOOKING';

-- AlterTable Vehicle
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "inventoryStatus" "VehicleInventoryStatus" NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "reservedByUserId" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "reservationToken" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "reservationPurpose" "ListingPurpose";
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "reservationExpiresAt" TIMESTAMP(3);
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vehicle_inventoryStatus_idx" ON "Vehicle"("inventoryStatus");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_reservedByUserId_fkey" FOREIGN KEY ("reservedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SaleBooking" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "status" "SaleBookingStatus" NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT,
    "customerMessage" TEXT,
    "preferredContactTime" TEXT,
    "meetingScheduledAt" TIMESTAMP(3),
    "meetingLocation" TEXT,
    "meetingNotes" TEXT,
    "agreedPriceCents" INTEGER,
    "paymentStatus" "SalePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleBooking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SaleBooking_vehicleId_idx" ON "SaleBooking"("vehicleId");
CREATE INDEX IF NOT EXISTS "SaleBooking_dealerId_idx" ON "SaleBooking"("dealerId");
CREATE INDEX IF NOT EXISTS "SaleBooking_status_idx" ON "SaleBooking"("status");

DO $$ BEGIN
  ALTER TABLE "SaleBooking" ADD CONSTRAINT "SaleBooking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SaleBooking" ADD CONSTRAINT "SaleBooking_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
