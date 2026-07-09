/**
 * Simulates 1000 concurrent reservation attempts against POST /api/vehicles/:id/reserve.
 *
 * Usage (dev server running):
 *   npx tsx scripts/test-reservation-concurrency.ts <vehicleId> [baseUrl]
 *
 * Expected: exactly 1 success (200), 999 conflicts (409).
 */
const vehicleId = process.argv[2];
const baseUrl = (process.argv[3] || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

if (!vehicleId) {
  console.error("Usage: npx tsx scripts/test-reservation-concurrency.ts <vehicleId> [baseUrl]");
  process.exit(1);
}

const CONCURRENCY = 1000;

async function attemptReserve(index: number) {
  const token = `test-token-${index}-${crypto.randomUUID()}`;

  const res = await fetch(`${baseUrl}/api/vehicles/${vehicleId}/reserve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-reservation-token": token,
    },
    body: JSON.stringify({ purpose: "RENTAL" }),
  });

  return { index, status: res.status };
}

async function main() {
  console.log(`Testing ${CONCURRENCY} concurrent reservations for vehicle ${vehicleId}...`);

  const results = await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => attemptReserve(i)));

  const success = results.filter((r) => r.status === 200).length;
  const conflicts = results.filter((r) => r.status === 409).length;
  const other = results.filter((r) => r.status !== 200 && r.status !== 409);

  console.log({ success, conflicts, other: other.length });

  if (success !== 1 || conflicts !== CONCURRENCY - 1) {
    console.error("FAIL — expected exactly 1 success and 999 conflicts");
    if (other.length > 0) {
      console.error("Unexpected statuses:", other.slice(0, 10));
    }
    process.exit(1);
  }

  console.log("PASS — concurrency control behaved correctly");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
