import SiteMapEmbed from "@/components/shared/SiteMapEmbed";
import ContactPhoneTrigger from "@/components/contact/ContactPhoneTrigger";
import { siteConfig } from "@/data/services";
import { Clock, MapPin, Phone } from "lucide-react";

export default function ContactSection() {
  return (
    <section className="bg-gray-900 text-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16 lg:items-stretch">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Visit Us in Darwin
            </h2>
            <p className="text-gray-300 text-base sm:text-lg mb-6 sm:mb-8 max-w-xl">
              Come see us at our showroom on Stuart Highway. We&apos;re here to help you find your
              perfect vehicle.
            </p>

            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg">Address</h3>
                  <p className="text-gray-300 text-sm sm:text-base break-words">
                    {siteConfig.address}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <Phone className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg">Phone</h3>
                  <ContactPhoneTrigger
                    phone={siteConfig.phone}
                    className="text-gray-300 hover:text-brand-blue-light transition-colors text-sm sm:text-base"
                  >
                    {siteConfig.phone}
                  </ContactPhoneTrigger>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-primary">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg">Opening Hours</h3>
                  <p className="text-gray-300 text-sm sm:text-base">{siteConfig.hours.weekdays}</p>
                  <p className="text-gray-300 text-sm sm:text-base">{siteConfig.hours.saturday}</p>
                  <p className="text-gray-300 text-sm sm:text-base">{siteConfig.hours.sunday}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="overflow-hidden rounded-xl bg-gray-800 h-[min(55vw,280px)] sm:h-[min(45vw,360px)] lg:h-full lg:min-h-[24rem]">
              <SiteMapEmbed heightClassName="h-full min-h-[220px]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
