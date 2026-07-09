const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateRentalDays(pickupAt: Date, dropoffAt: Date): number {
  const diffMs = dropoffAt.getTime() - pickupAt.getTime();
  return Math.max(1, Math.ceil(diffMs / MS_PER_DAY));
}

export function calculateRentalTotalCents(pricePerDayAud: number, rentalDays: number): number {
  return Math.max(0, pricePerDayAud) * rentalDays * 100;
}

export function formatRentalPriceSummary(
  pricePerDayAud: number,
  rentalDays: number,
  totalAmountCents: number
): string {
  const totalAud = (totalAmountCents / 100).toFixed(2);
  return `${rentalDays} day${rentalDays === 1 ? "" : "s"} × $${pricePerDayAud}/day = $${totalAud} AUD`;
}
