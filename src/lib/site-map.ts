import { siteConfig } from "@/data/services";

/** Same map query used on the homepage contact section */
export function getSiteMapQuery(): string {
  return siteConfig.mapQuery || siteConfig.address;
}

export function getSiteMapEmbedUrl(): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(getSiteMapQuery())}&output=embed`;
}

export function getSiteMapDirectionsUrl(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getSiteMapQuery())}`;
}

export const dealershipLocation = {
  id: "everest-car-rental",
  label: siteConfig.shortName,
  address: siteConfig.address,
} as const;
