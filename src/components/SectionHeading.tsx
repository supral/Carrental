"use client";

import { useVideoPage } from "@/components/layout/VideoPageContext";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** Force light (white) text for video backgrounds */
  light?: boolean;
  /** Heading sits on a frosted/white panel — keep dark text */
  onPanel?: boolean;
  className?: string;
}

export default function SectionHeading({
  title,
  subtitle,
  align = "center",
  light,
  onPanel = false,
  className,
}: SectionHeadingProps) {
  const { onVideo } = useVideoPage();
  const useLightText = light ?? (onVideo && !onPanel);

  return (
    <div
      className={cn(
        "mb-10 lg:mb-14",
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      <h2
        className={cn(
          "text-3xl sm:text-4xl font-bold mb-4",
          useLightText ? "text-white drop-shadow-sm" : "text-gray-900"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "text-lg max-w-2xl",
            align === "center" ? "mx-auto" : "",
            useLightText ? "text-gray-200" : "text-gray-600"
          )}
        >
          {subtitle}
        </p>
      )}
      <div
        className={cn(
          "mt-4 h-1 w-16 bg-primary rounded-full",
          align === "center" ? "mx-auto" : ""
        )}
      />
    </div>
  );
}
