"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: SpinnerSize;
  className?: string;
}) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", SIZE_CLASS[size], className)}
      aria-hidden
    />
  );
}

/** Inline spinner + label for buttons and compact status text. */
export function LoadingLabel({
  label = "Loading...",
  size = "sm",
  className,
}: {
  label?: string;
  size?: SpinnerSize;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center justify-center gap-2", className)}>
      <LoadingSpinner size={size} className="text-current" />
      <span>{label}</span>
    </span>
  );
}

/** Centered block for page/section loading states. */
export function PageLoader({
  label = "Loading...",
  className,
  fullScreen = false,
}: {
  label?: string;
  className?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        fullScreen ? "min-h-[60vh] px-4" : "py-12 px-4",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingSpinner size="lg" />
      <p className="text-sm font-medium text-muted-foreground sm:text-base">{label}</p>
    </div>
  );
}

/** Dim overlay on a relative parent while an action runs. */
export function LoadingOverlay({
  show,
  label = "Please wait...",
  className,
}: {
  show: boolean;
  label?: string;
  className?: string;
}) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/70 backdrop-blur-[1px]",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-lg">
        <LoadingSpinner size="md" />
        <p className="text-sm font-medium text-gray-800">{label}</p>
      </div>
    </div>
  );
}
