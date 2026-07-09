"use client";

import Link from "next/link";
import { isNavLinkActive } from "@/data/navigation";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  label: string;
  pathname: string;
  search: string;
  onClick?: () => void;
  className?: string;
}

export default function NavItem({ href, label, pathname, search, onClick, className }: NavItemProps) {
  const active = isNavLinkActive(pathname, href, search);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative inline-block px-1 py-2 text-[15px] font-medium lg:text-base",
        active ? "font-semibold text-primary" : "text-gray-700",
        className
      )}
    >
      {label}
      {active && (
        <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-primary" aria-hidden />
      )}
    </Link>
  );
}
