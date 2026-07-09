"use client";

import { useSearchParams } from "next/navigation";
import NavItem from "@/components/layout/NavItem";
import type { NavLink } from "@/data/navigation";

interface DesktopNavProps {
  links: NavLink[];
  pathname: string;
}

export function DesktopNavFallback({ links }: { links: NavLink[] }) {
  return (
    <nav className="hidden flex-1 items-center justify-center xl:flex" aria-hidden>
      <ul className="flex items-center gap-6 2xl:gap-10">
        {links.map((link) => (
          <li key={link.href}>
            <span className="inline-block px-1 py-2 text-[15px] font-medium text-transparent lg:text-base">
              {link.label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function DesktopNav({ links, pathname }: DesktopNavProps) {
  const search = useSearchParams().toString();

  return (
    <nav className="hidden flex-1 items-center justify-center xl:flex" aria-label="Main navigation">
      <ul className="flex items-center gap-6 2xl:gap-10">
        {links.map((link) => (
          <li key={link.href}>
            <NavItem href={link.href} label={link.label} pathname={pathname} search={search} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
