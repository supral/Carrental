import Link from "next/link";
import { siteConfig } from "@/data/services";
import HeroSearchWidget from "@/components/marketplace/HeroSearchWidget";
import HeroVideoBackground from "@/components/HeroVideoBackground";

interface HeroProps {
  title?: string;
  subtitle?: string;
  showCTA?: boolean;
  showSearch?: boolean;
  compact?: boolean;
}

export default function Hero({
  title = siteConfig.name,
  subtitle = siteConfig.tagline,
  showCTA = false,
  showSearch = true,
  compact = false,
}: HeroProps) {
  return (
    <section
      className={`relative overflow-hidden text-white ${
        compact ? "py-14 lg:py-16" : "py-16 lg:py-24"
      }`}
    >
      <HeroVideoBackground variant="home" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-red-400">
            Everest Car Rental
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="text-lg leading-relaxed text-gray-200 sm:text-xl">{subtitle}</p>
        </div>

        {showSearch && <HeroSearchWidget />}

        {showCTA && (
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/vehicles"
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-8 py-3.5 text-base font-semibold text-white"
            >
              View Inventory
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/80 px-8 py-3.5 text-base font-semibold text-white"
            >
              Contact Us
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
