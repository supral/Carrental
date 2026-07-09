-- Add fleet inventory field
ALTER TABLE "Vehicle" ADD COLUMN "totalUnits" INTEGER NOT NULL DEFAULT 1;

-- Extend rental booking lifecycle statuses for fleet inventory
ALTER TYPE "RentalBookingStatus" ADD VALUE IF NOT EXISTS 'RESERVED';
ALTER TYPE "RentalBookingStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
