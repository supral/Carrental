export interface NavLink {
  href: string;
  label: string;
}

export const mainNavLinks: NavLink[] = [
  { href: "/car-rental", label: "Rentals" },
  { href: "/my-bookings", label: "My Bookings" },
  { href: "/contact", label: "Contact" },
];

export const footerNavLinks: NavLink[] = [
  ...mainNavLinks,
  { href: "/privacy-policy", label: "Privacy Policy" },
];

export function isNavLinkActive(pathname: string, href: string, search?: string): boolean {
  const [path, query] = href.split("?");
  if (path === "/") return pathname === "/";

  if (path === "/contact") {
    if (pathname !== "/contact") return false;
    const subject = new URLSearchParams(query ?? "").get("subject");
    const currentSubject = search ? new URLSearchParams(search).get("subject") : null;
    if (subject === "sell") return currentSubject === "sell";
    return currentSubject !== "sell";
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}
