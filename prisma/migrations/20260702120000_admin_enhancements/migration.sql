-- CreateEnum
CREATE TYPE "RentalOptionCategory" AS ENUM ('INSURANCE', 'EXTRA', 'PROTECTION', 'ACCESSORY');
CREATE TYPE "TemplateFieldInputType" AS ENUM ('TEXT', 'NUMBER', 'TEXTAREA', 'BOOLEAN');

-- VehicleType
CREATE TABLE "VehicleType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleType_name_key" ON "VehicleType"("name");

-- VehicleTemplateField
CREATE TABLE "VehicleTemplateField" (
    "id" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputType" "TemplateFieldInputType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "group" TEXT NOT NULL DEFAULT 'Specifications',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleTemplateField_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VehicleTemplateField_vehicleTypeId_idx" ON "VehicleTemplateField"("vehicleTypeId");
ALTER TABLE "VehicleTemplateField" ADD CONSTRAINT "VehicleTemplateField_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VehicleTemplateValue
CREATE TABLE "VehicleTemplateValue" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "templateFieldId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleTemplateValue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleTemplateValue_vehicleId_templateFieldId_key" ON "VehicleTemplateValue"("vehicleId", "templateFieldId");
CREATE INDEX "VehicleTemplateValue_vehicleId_idx" ON "VehicleTemplateValue"("vehicleId");
ALTER TABLE "VehicleTemplateValue" ADD CONSTRAINT "VehicleTemplateValue_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleTemplateValue" ADD CONSTRAINT "VehicleTemplateValue_templateFieldId_fkey" FOREIGN KEY ("templateFieldId") REFERENCES "VehicleTemplateField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VehicleCustomField
CREATE TABLE "VehicleCustomField" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputType" "TemplateFieldInputType" NOT NULL DEFAULT 'TEXT',
    "value" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "group" TEXT NOT NULL DEFAULT 'Vehicle Details',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleCustomField_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VehicleCustomField_vehicleId_idx" ON "VehicleCustomField"("vehicleId");
ALTER TABLE "VehicleCustomField" ADD CONSTRAINT "VehicleCustomField_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RentalOption
CREATE TABLE "RentalOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RentalOptionCategory" NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priceType" "RentalOptionPriceType" NOT NULL DEFAULT 'PER_DAY',
    "supportsQuantity" BOOLEAN NOT NULL DEFAULT false,
    "maxQuantity" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RentalOption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RentalOption_active_idx" ON "RentalOption"("active");
CREATE INDEX "RentalOption_category_idx" ON "RentalOption"("category");

-- VehicleRentalOption
CREATE TABLE "VehicleRentalOption" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "rentalOptionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priceOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleRentalOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VehicleRentalOption_vehicleId_rentalOptionId_key" ON "VehicleRentalOption"("vehicleId", "rentalOptionId");
CREATE INDEX "VehicleRentalOption_vehicleId_idx" ON "VehicleRentalOption"("vehicleId");
ALTER TABLE "VehicleRentalOption" ADD CONSTRAINT "VehicleRentalOption_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleRentalOption" ADD CONSTRAINT "VehicleRentalOption_rentalOptionId_fkey" FOREIGN KEY ("rentalOptionId") REFERENCES "RentalOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vehicle columns
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "vehicleTypeId" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "availableUnits" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS "Vehicle_vehicleTypeId_idx" ON "Vehicle"("vehicleTypeId");
ALTER TABLE "Vehicle" DROP CONSTRAINT IF EXISTS "Vehicle_vehicleTypeId_fkey";
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Vehicle" SET "availableUnits" = "totalUnits" WHERE "listingPurpose" = 'RENTAL';

-- RentalBooking
ALTER TABLE "RentalBooking" ADD COLUMN IF NOT EXISTS "inventoryHeld" BOOLEAN NOT NULL DEFAULT false;
