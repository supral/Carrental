"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { siteConfig } from "@/data/services";
import { cn } from "@/lib/utils";

interface AdminBrandProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function AdminBrand({ collapsed, onToggle }: AdminBrandProps) {
  if (collapsed) {
    return (
      <div className="relative flex flex-col items-center gap-2 border-b border-border bg-gradient-to-b from-primary/8 to-card px-2 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-1 top-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <Link
          href="/admin"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border/60 transition-shadow hover:shadow-md"
          aria-label={`${siteConfig.name} Admin`}
        >
          <Image
            src={siteConfig.logo.stacked}
            alt={siteConfig.name}
            width={siteConfig.logo.stackedWidth}
            height={siteConfig.logo.stackedHeight}
            className="h-9 w-9 object-contain"
            priority
          />
        </Link>
      </div>
    );
  }

  return (
    <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-4 py-4">
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Collapse sidebar"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <Link href="/admin" className="group flex items-center gap-3 pr-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border/60 transition-all group-hover:shadow-md group-hover:ring-primary/20">
          <Image
            src={siteConfig.logo.stacked}
            alt={siteConfig.name}
            width={siteConfig.logo.stackedWidth}
            height={siteConfig.logo.stackedHeight}
            className="h-11 w-11 object-contain"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5",
              "text-[10px] font-semibold uppercase tracking-wider text-primary"
            )}
          >
            Admin Panel
          </span>
        </div>
      </Link>
    </div>
  );
}
