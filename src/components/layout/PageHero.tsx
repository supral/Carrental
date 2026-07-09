import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  innerClassName?: string;
  padding?: "default" | "compact" | "large" | "xlarge";
  titleClassName?: string;
  align?: "left" | "center";
}

const paddingClasses = {
  default: "py-16 lg:py-20",
  compact: "py-10 lg:py-14",
  large: "py-16 lg:py-24",
  xlarge: "py-24 lg:py-36",
};

export default function PageHero({
  eyebrow,
  title,
  description,
  children,
  className,
  innerClassName,
  padding = "default",
  titleClassName,
  align = "center",
}: PageHeroProps) {
  const isCentered = align === "center";

  return (
    <section
      className={cn(
        "text-white",
        paddingClasses[padding],
        className
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
          isCentered && "flex flex-col items-center text-center",
          innerClassName
        )}
      >
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-blue-light">{eyebrow}</p>
        ) : null}
        <h1
          className={cn(
            "text-4xl font-bold sm:text-5xl",
            eyebrow && "mt-3",
            isCentered && "max-w-4xl",
            titleClassName
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "mt-6 max-w-3xl text-lg leading-relaxed text-gray-200",
              isCentered && "mx-auto"
            )}
          >
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
