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
  const onVercel = Boolean(process.env.VERCEL);
  const normalize = (value: string) => {
    const normalized = value.trim().replace(/\/$/, "");
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return normalized;
    }
    return `https://${normalized}`;
  };
  const isPreviewHost = (url: string) => {
    try {
      return /\.vercel\.app$/i.test(new URL(url).hostname);
    } catch {
      return false;
    }
  };

  const deploymentUrl = process.env.VERCEL_URL
    ? normalize(process.env.VERCEL_URL)
    : undefined;

  const configured = [process.env.NEXT_PUBLIC_APP_URL, process.env.AUTH_URL]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map(normalize)
    .find((url) => !(onVercel && /localhost|127\.0\.0\.1/i.test(url)));

  if (configured) {
    if (
      onVercel &&
      deploymentUrl &&
      isPreviewHost(configured) &&
      configured !== deploymentUrl
    ) {
      return deploymentUrl;
    }
    return configured;
  }

  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }

  if (deploymentUrl) return deploymentUrl;

  return onVercel ? "https://www.everestcarrental.com" : "http://localhost:3001";
}
