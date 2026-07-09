export function slugifyDealerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "dealer";
}

export function getDealerSitePath(slug: string | null | undefined): string | null {
  if (!slug || slug === "undefined") return null;
  return `/dealers/${slug}`;
}

export function getDealerSiteUrl(slug: string | null | undefined, baseUrl?: string): string | null {
  const path = getDealerSitePath(slug);
  if (!path) return null;
  if (baseUrl) return `${baseUrl.replace(/\/$/, "")}${path}`;
  return path;
}
