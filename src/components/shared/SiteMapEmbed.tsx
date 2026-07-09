import { cn } from "@/lib/utils";
import { getSiteMapEmbedUrl } from "@/lib/site-map";

interface SiteMapEmbedProps {
  title?: string;
  className?: string;
  heightClassName?: string;
}

export default function SiteMapEmbed({
  title = "Everest Car Rental Location",
  className = "",
  heightClassName = "h-full min-h-[200px]",
}: SiteMapEmbedProps) {
  return (
    <iframe
      title={title}
      src={getSiteMapEmbedUrl()}
      className={cn("w-full border-0 grayscale-[30%]", heightClassName, className)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
