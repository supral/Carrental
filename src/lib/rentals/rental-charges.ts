export const DEFAULT_DAILY_LIMIT_KM = 200;
export const DEFAULT_EXCESS_KM_RATE_CENTS = 35; // $0.35/km
export const DEFAULT_FUEL_CHARGE_CENTS = 15000; // $150 flat when returned with less fuel
export const DEFAULT_LATE_FEE_PER_HOUR_CENTS = 2500; // $25/hour
export const DEFAULT_BOND_CENTS = 50000; // $500

export type FuelLevel =
  | "Empty"
  | "1/8"
  | "1/4"
  | "3/8"
  | "1/2"
  | "5/8"
  | "3/4"
  | "7/8"
  | "Full";

export const FUEL_LEVELS: FuelLevel[] = [
  "Empty",
  "1/8",
  "1/4",
  "3/8",
  "1/2",
  "5/8",
  "3/4",
  "7/8",
  "Full",
];

export function fuelLevelRank(level: string | null | undefined): number {
  if (!level) return -1;
  const idx = FUEL_LEVELS.findIndex((item) => item.toLowerCase() === level.toLowerCase());
  return idx;
}

export type ChargeCalcInput = {
  kmOut: number;
  expectedKmIn: number;
  kmIn: number;
  fuelOut: string;
  fuelIn: string;
  excessKmRateCents: number;
  fuelChargeCents: number;
  expectedReturnAt: Date;
  returnedAt: Date;
  lateFeePerHourCents?: number;
  damageChargeCents?: number;
  rentalTotalCents?: number;
};

export type ChargeCalcResult = {
  extraKm: number;
  extraKmChargeCents: number;
  fuelChargeCents: number;
  lateHours: number;
  lateFeeCents: number;
  lateReturn: boolean;
  damageChargeCents: number;
  rentalTotalCents: number;
  grandTotalCents: number;
  outstandingBalanceCents: number;
};

export function calculateReturnCharges(input: ChargeCalcInput): ChargeCalcResult {
  const extraKm = Math.max(0, input.kmIn - input.expectedKmIn);
  const extraKmChargeCents = extraKm * Math.max(0, input.excessKmRateCents);

  const outRank = fuelLevelRank(input.fuelOut);
  const inRank = fuelLevelRank(input.fuelIn);
  const fuelChargeCents =
    outRank >= 0 && inRank >= 0 && inRank < outRank ? Math.max(0, input.fuelChargeCents) : 0;

  const msLate = input.returnedAt.getTime() - input.expectedReturnAt.getTime();
  const lateReturn = msLate > 15 * 60 * 1000;
  const lateHours = lateReturn ? Math.ceil(msLate / (60 * 60 * 1000)) : 0;
  const lateFeeCents =
    lateHours * (input.lateFeePerHourCents ?? DEFAULT_LATE_FEE_PER_HOUR_CENTS);

  const damageChargeCents = Math.max(0, input.damageChargeCents ?? 0);
  const rentalTotalCents = Math.max(0, input.rentalTotalCents ?? 0);
  const grandTotalCents =
    rentalTotalCents + extraKmChargeCents + fuelChargeCents + lateFeeCents + damageChargeCents;

  return {
    extraKm,
    extraKmChargeCents,
    fuelChargeCents,
    lateHours,
    lateFeeCents,
    lateReturn,
    damageChargeCents,
    rentalTotalCents,
    grandTotalCents,
    outstandingBalanceCents: extraKmChargeCents + fuelChargeCents + lateFeeCents + damageChargeCents,
  };
}
