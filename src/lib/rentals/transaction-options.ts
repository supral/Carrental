/** Neon / remote Postgres can exceed Prisma's default 5s interactive transaction limit. */
export const RENTAL_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;
