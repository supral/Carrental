"use client";

import type { ReactNode } from "react";
import HeroVideoBackground from "@/components/HeroVideoBackground";
import { VideoPageContext } from "@/components/layout/VideoPageContext";
import type { HeroVideoVariant } from "@/lib/hero-videos";
import { cn } from "@/lib/utils";

export default function VideoPageShell({
  variant,
  children,
  className,
}: {
  variant: HeroVideoVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <VideoPageContext.Provider value={{ onVideo: true }}>
      <div className="relative isolate min-h-full">
        <div className="pointer-events-none absolute inset-0 z-0">
          <HeroVideoBackground variant={variant} fullPage />
        </div>
        <div
          className={cn(
            "relative z-10",
            "[&_section.bg-gray-50]:bg-white/88 [&_section.bg-gray-50]:backdrop-blur-md",
            className
          )}
        >
          {children}
        </div>
      </div>
    </VideoPageContext.Provider>
  );
}
