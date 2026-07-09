"use client";

import Link from "next/link";
import { Bell, Phone } from "lucide-react";
import { siteConfig } from "@/data/services";
import ContactPhoneTrigger from "@/components/contact/ContactPhoneTrigger";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  className?: string;
  compact?: boolean;
}

function IconButton({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600"
      aria-label={label}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export default function ActionButtons({ className, compact = false }: ActionButtonsProps) {
  return (
    <div className={cn("flex items-center gap-1.5 xl:gap-2", className)}>
      {!compact && (
        <IconButton href="/my-bookings" label="My bookings">
          <Bell className="h-5 w-5" />
        </IconButton>
      )}

      <ContactPhoneTrigger phone={siteConfig.phone}>
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm sm:text-sm sm:px-4 sm:py-2">
          <Phone className="h-4 w-4 shrink-0" />
          {siteConfig.phone}
        </span>
      </ContactPhoneTrigger>
    </div>
  );
}
