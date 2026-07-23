import { siteConfig } from "@/data/services";

export const RENTAL_CHANNELS = ["NB_AUTOMOTIVE", "EVEREST"] as const;
export type RentalChannel = (typeof RENTAL_CHANNELS)[number];

export type RentalBrandColors = {
  primary: string;
  accent: string;
  primaryLight: string;
  totalBg: string;
  sectionBg: string;
};

export type RentalBrandConfig = {
  channel: RentalChannel;
  name: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  websiteUrl: string;
  abn: string;
  agreementPrefix: string;
  qrColor: string;
  colors: RentalBrandColors;
  logo: {
    emblem: string;
    header: string;
    horizontal: string;
    stacked: string;
  };
};

const EVEREST_BRAND: RentalBrandConfig = {
  channel: "EVEREST",
  name: siteConfig.name,
  tagline: siteConfig.tagline,
  email: siteConfig.email,
  phone: siteConfig.phone,
  address: siteConfig.address,
  website: siteConfig.website,
  websiteUrl: siteConfig.websiteUrl || "https://www.everestcarrental.com",
  abn: siteConfig.abn || "",
  agreementPrefix: "ECR",
  qrColor: "#0A4D8C",
  colors: {
    primary: "#0A4D8C",
    accent: "#0A4D8C",
    primaryLight: "#e8f0f8",
    totalBg: "#ebf5ff",
    sectionBg: "#0A4D8C",
  },
  logo: {
    emblem: siteConfig.logo.stacked,
    header: siteConfig.logo.horizontal,
    horizontal: siteConfig.logo.horizontal,
    stacked: siteConfig.logo.stacked,
  },
};

const NB_BRAND: RentalBrandConfig = {
  channel: "NB_AUTOMOTIVE",
  name: "NB Automotive",
  tagline: "Best Car Dealership in Darwin",
  email: "info@nbautomotive.com.au",
  phone: "08 8947 0556",
  address: "482 Stuart Highway, Winnellie NT 0820",
  website: "www.nbautomotive.com.au",
  websiteUrl: "https://www.nbautomotive.com.au",
  abn: process.env.NEXT_PUBLIC_COMPANY_ABN || "",
  agreementPrefix: "NBA",
  qrColor: "#dc2626",
  colors: {
    primary: "#dc2626",
    accent: "#111827",
    primaryLight: "#fee2e2",
    totalBg: "#fff5f5",
    sectionBg: "#111827",
  },
  logo: {
    emblem: "/images/nb-logo-emblem.png",
    header: "/images/nb-automotive-logo.png",
    horizontal: "/images/nb-automotive-logo.png",
    stacked: "/images/nb-logo-transparent.png",
  },
};

export function getAppDefaultRentalChannel(): RentalChannel {
  const env = process.env.RENTAL_CHANNEL_DEFAULT || process.env.NEXT_PUBLIC_RENTAL_CHANNEL;
  return env === "NB_AUTOMOTIVE" ? "NB_AUTOMOTIVE" : "EVEREST";
}

export function normalizeRentalChannel(value?: string | null): RentalChannel | null {
  if (value === "EVEREST" || value === "NB_AUTOMOTIVE") return value;
  return null;
}

export function resolveBookingRentalChannel(booking: {
  rentalChannel?: string | null;
}): RentalChannel {
  return normalizeRentalChannel(booking.rentalChannel) ?? getAppDefaultRentalChannel();
}

export function getRentalBrand(channel?: RentalChannel | string | null): RentalBrandConfig {
  const resolved = normalizeRentalChannel(channel) ?? getAppDefaultRentalChannel();
  return resolved === "EVEREST" ? EVEREST_BRAND : NB_BRAND;
}
