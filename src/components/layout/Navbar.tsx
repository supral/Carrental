"use client";

import Logo from "@/components/Logo";
import ActionButtons from "@/components/layout/ActionButtons";
import { cn } from "@/lib/utils";

interface NavbarProps {
  scrolled: boolean;
  onOpenMobile: () => void;
  children: React.ReactNode;
}

export default function Navbar({ scrolled, onOpenMobile, children }: NavbarProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 transition-all duration-300 lg:gap-6 lg:px-8",
        scrolled ? "h-32" : "h-32 lg:h-36"
      )}
    >
      <div className="flex shrink-0 items-center">
        <Logo variant="header" />
      </div>

      {children}

      <div className="flex shrink-0 items-center gap-2">
        <ActionButtons className="hidden lg:flex" />
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-700 xl:hidden"
          onClick={onOpenMobile}
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
