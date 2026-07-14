$ErrorActionPreference = "Stop"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/nb_automotive?schema=public"
Set-Location "d:\NB_motors\forrentals"

Write-Host "Fixing local DB migrations at localhost:5433..."

# Clear failed migration record if present
npx prisma migrate resolve --rolled-back 20260713150000_fleet_vehicles 2>$null

Get-Content "prisma\migrations\20260713150000_fleet_vehicles\apply_idempotent.sql" |
  npx prisma db execute --stdin --schema prisma/schema.prisma

npx prisma migrate resolve --applied 20260713150000_fleet_vehicles

Get-Content "prisma\migrations\20260714120000_digital_rental_agreement\apply_idempotent.sql" |
  npx prisma db execute --stdin --schema prisma/schema.prisma

npx prisma migrate resolve --applied 20260714120000_digital_rental_agreement

Get-Content "prisma\migrations\20260714140000_fleet_make_model\migration.sql" |
  npx prisma db execute --stdin --schema prisma/schema.prisma

npx prisma migrate resolve --applied 20260714140000_fleet_make_model

Write-Host "Done. Verifying columns..."
@'
SELECT column_name FROM information_schema.columns
WHERE table_name = 'FleetVehicle' AND column_name IN ('make', 'model', 'year')
ORDER BY column_name;
'@ | npx prisma db execute --stdin --schema prisma/schema.prisma

npx prisma migrate status
