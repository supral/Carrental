import SiteMapEmbed from "@/components/shared/SiteMapEmbed";
import ContactPhoneTrigger from "@/components/contact/ContactPhoneTrigger";
import { siteConfig } from "@/data/services";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

export default function ContactSection() {
  return (
    <div className="h-full">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Visit Us</h2>
      <p className="mt-2 text-sm sm:text-base text-gray-600">
        Drop by our Darwin branch or call us — we&apos;re here to help with your rental.
      </p>

      <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:h-12 sm:w-12">
            <MapPin className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">Address</h3>
            <p className="text-sm text-gray-600 sm:text-base break-words">{siteConfig.address}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:h-12 sm:w-12">
            <Phone className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">Phone</h3>
            <ContactPhoneTrigger
              phone={siteConfig.phone}
              className="text-sm text-gray-600 transition-colors hover:text-primary sm:text-base"
            >
              {siteConfig.phone}
            </ContactPhoneTrigger>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:h-12 sm:w-12">
            <Mail className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">Email</h3>
            <a
              href={`mailto:${siteConfig.email}`}
              className="text-sm text-gray-600 break-all transition-colors hover:text-primary sm:text-base"
            >
              {siteConfig.email}
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:h-12 sm:w-12">
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">Opening Hours</h3>
            <p className="text-sm text-gray-600 sm:text-base">{siteConfig.hours.weekdays}</p>
            <p className="text-sm text-gray-600 sm:text-base">{siteConfig.hours.saturday}</p>
            <p className="text-sm text-gray-600 sm:text-base">{siteConfig.hours.sunday}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-gray-100 sm:mt-8">
        <SiteMapEmbed heightClassName="h-[220px] sm:h-[260px]" />
      </div>
    </div>
  );
}
