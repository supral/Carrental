import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }

  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Skip Stripe checkout — used when Stripe is not set up or BYPASS_STRIPE_PAYMENT=true */
export function shouldBypassStripePayment(): boolean {
  if (process.env.BYPASS_STRIPE_PAYMENT === "true") return true;
  return !isStripeConfigured();
}

/** Public site base URL for redirects, emails, and Stripe return URLs. */
export function getAppBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const value of candidates) {
    if (!value?.trim()) continue;
    const normalized = value.trim().replace(/\/$/, "");
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return normalized;
    }
    return `https://${normalized}`;
  }

  return "http://localhost:3001";
}
