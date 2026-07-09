"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { siteConfig } from "@/data/services";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "navbar" | "footer" | "admin" | "header";
  showTagline?: boolean;
  compact?: boolean;
  size?: "default" | "lg" | "xl";
  className?: string;
  subtitle?: string;
}

function HomeLogoLink({
  children,
  className,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    event.preventDefault();
    router.push("/");
  };

  return (
    <Link
      href="/"
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel ?? `Go to ${siteConfig.name} home page`}
    >
      {children}
    </Link>
  );
}

function BrandLogo({
  layout = "stacked",
  className,
  priority = false,
}: {
  layout?: "stacked" | "horizontal" | "footer";
  className?: string;
  priority?: boolean;
}) {
  const src =
    layout === "footer"
      ? siteConfig.logo.footer
      : layout === "horizontal"
        ? siteConfig.logo.horizontal
        : siteConfig.logo.stacked;

  const width =
    layout === "footer"
      ? siteConfig.logo.footerWidth
      : layout === "horizontal"
        ? siteConfig.logo.horizontalWidth
        : siteConfig.logo.stackedWidth;

  const height =
    layout === "footer"
      ? siteConfig.logo.footerHeight
      : layout === "horizontal"
        ? siteConfig.logo.horizontalHeight
        : siteConfig.logo.stackedHeight;

  return (
    <Image
      src={src}
      alt={siteConfig.name}
      width={width}
      height={height}
      className={cn("w-auto object-contain", className)}
      priority={priority}
    />
  );
}

export default function Logo({
  variant = "navbar",
  showTagline = false,
  compact = false,
  size = "default",
  className,
  subtitle,
}: LogoProps) {
  const isFooter = variant === "footer";
  const isAdmin = variant === "admin";
  const isLarge = size === "lg";

  if (isAdmin && compact) {
    return (
      <Link href="/admin" className={cn("inline-flex items-center justify-center", className)} aria-label={`${siteConfig.name} Admin`}>
        <BrandLogo layout="stacked" className="h-10 w-10" priority />
      </Link>
    );
  }

  if (isAdmin) {
    return (
      <Link
        href="/admin"
        className={cn(
          "inline-flex items-center gap-3 group",
          isLarge ? "flex-col text-center" : "flex-row",
          className
        )}
      >
        <BrandLogo layout="stacked" className={isLarge ? "h-16 w-16" : "h-12 w-12"} priority />
        {showTagline && (
          <span className={cn("font-medium text-muted-foreground", isLarge ? "text-base" : "text-xs")}>
            {subtitle ?? "Admin Panel"}
          </span>
        )}
      </Link>
    );
  }

  if (variant === "header") {
    return (
      <HomeLogoLink className={cn("inline-flex shrink-0 items-center", className)}>
        <BrandLogo layout="horizontal" className="h-8 w-auto sm:h-9 lg:h-10" priority />
      </HomeLogoLink>
    );
  }

  if (isFooter) {
    return (
      <HomeLogoLink className={cn("inline-flex flex-col items-start", className)}>
        <BrandLogo layout="footer" className="h-10 w-auto sm:h-11" priority />
        {showTagline && (
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-blue-200/70">{siteConfig.tagline}</p>
        )}
      </HomeLogoLink>
    );
  }

  return (
    <HomeLogoLink className={cn("inline-flex items-center", className)}>
      <BrandLogo layout="stacked" className="h-10 w-10" priority />
    </HomeLogoLink>
  );
}
