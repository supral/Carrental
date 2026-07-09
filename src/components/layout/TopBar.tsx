import { Clock, Mail, MapPin } from "lucide-react";
import { siteConfig } from "@/data/services";
import SocialLinks from "@/components/layout/SocialLinks";
import ContactEmailTrigger from "@/components/contact/ContactEmailTrigger";

export default function TopBar() {
  return (
    <div className="hidden border-b border-white/10 bg-brand-dark md:block">
      <div className="mx-auto flex h-9 max-w-[1440px] items-center justify-between px-4 text-xs text-blue-100/80 lg:h-10 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <ContactEmailTrigger
            email={siteConfig.email}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <Mail className="h-3.5 w-3.5 shrink-0 text-brand-blue-light" aria-hidden />
            <span>{siteConfig.email}</span>
          </ContactEmailTrigger>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-blue-light" aria-hidden />
            <span>{siteConfig.location}</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <SocialLinks platforms={["facebook", "instagram"]} />
          <span className="hidden items-center gap-1.5 border-l border-white/10 pl-4 text-blue-100/80 lg:inline-flex">
            <Clock className="h-3.5 w-3.5 shrink-0 text-brand-blue-light" aria-hidden />
            <span>Business Hours: {siteConfig.hours.utilityBar}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
