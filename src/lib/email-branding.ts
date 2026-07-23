import { siteConfig } from "@/data/services";
import {
  getRentalBrand,
  resolveBookingRentalChannel,
  type RentalBrandConfig,
  type RentalChannel,
} from "@/lib/rentals/rental-brand";

export function getPublicSiteUrl(brand?: RentalBrandConfig): string {
  if (brand?.websiteUrl) return brand.websiteUrl.replace(/\/$/, "");
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    siteConfig.websiteUrl,
  ];
  for (const value of candidates) {
    if (!value?.trim()) continue;
    const normalized = value.trim().replace(/\/$/, "");
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return normalized;
    }
    return `https://${normalized}`;
  }
  return "https://www.nbautomotive.com.au";
}

export function getPublicLogoUrl(brand?: RentalBrandConfig): string {
  const resolved = brand ?? getRentalBrand();
  return `${getPublicSiteUrl(resolved)}${resolved.logo.header}`;
}

/** Branded HTML wrapper — logo in the email body (Gmail sender avatar needs BIMI / mailbox profile). */
export function buildBrandedEmailHtml(opts: {
  title?: string;
  bodyHtml: string;
  rentalChannel?: RentalChannel | string | null;
  brand?: RentalBrandConfig;
}): string {
  const brand =
    opts.brand ??
    getRentalBrand(resolveBookingRentalChannel({ rentalChannel: opts.rentalChannel }));
  const logoUrl = getPublicLogoUrl(brand);
  const { primary, accent } = brand.colors;
  const titleBlock = opts.title
    ? `<h2 style="margin:0 0 16px;font-size:22px;color:${accent}">${opts.title}</h2>`
    : "";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;max-width:640px;color:#111827;margin:0 auto">
      <div style="padding:20px 0 16px;border-bottom:3px solid ${primary};margin-bottom:24px">
        <img
          src="${logoUrl}"
          alt="${brand.name}"
          width="200"
          height="auto"
          style="display:block;max-width:200px;height:auto;border:0"
        />
      </div>
      ${titleBlock}
      ${opts.bodyHtml}
      <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">
        <strong>${brand.name}</strong><br/>
        ${brand.address}<br/>
        ${brand.phone} · <a href="mailto:${brand.email}" style="color:${primary}">${brand.email}</a><br/>
        <a href="${getPublicSiteUrl(brand)}" style="color:${primary}">${brand.website}</a>
      </p>
    </div>
  `.trim();
}
