-- CreateTable
CREATE TABLE IF NOT EXISTS "SeasonOffer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "offerDiscountType" TEXT NOT NULL DEFAULT 'AMOUNT',
    "offerAmount" DECIMAL(10,2),
    "offerPercent" DECIMAL(5,2),
    "offerStartDate" TIMESTAMP(3),
    "offerEndDate" TIMESTAMP(3),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonOffer_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "seasonOfferId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_seasonOfferId_fkey" FOREIGN KEY ("seasonOfferId") REFERENCES "SeasonOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vehicle_seasonOfferId_idx" ON "Vehicle"("seasonOfferId");
CREATE INDEX IF NOT EXISTS "SeasonOffer_isEnabled_idx" ON "SeasonOffer"("isEnabled");
