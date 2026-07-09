-- Structured vehicle details (replaces free-form description/features in admin UI)
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "details" JSONB;

ALTER TABLE "Vehicle" ALTER COLUMN "description" SET DEFAULT '';
ALTER TABLE "Vehicle" ALTER COLUMN "description" DROP NOT NULL;
