-- Dealer microsite fields
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT NOT NULL DEFAULT '#dc2626';

UPDATE "Dealer"
SET "slug" = trim(both '-' from lower(regexp_replace(coalesce("name", 'dealer'), '[^a-zA-Z0-9]+', '-', 'g')))
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "Dealer" d
SET "slug" = d."slug" || '-' || substr(d."id", 1, 6)
WHERE d."id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (PARTITION BY "slug" ORDER BY "createdAt") AS rn
    FROM "Dealer"
  ) t
  WHERE rn > 1
);

ALTER TABLE "Dealer" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Dealer_slug_key" ON "Dealer"("slug");
CREATE INDEX IF NOT EXISTS "Dealer_slug_idx" ON "Dealer"("slug");

ALTER TABLE "Dealer" ALTER COLUMN "description" TYPE TEXT;
