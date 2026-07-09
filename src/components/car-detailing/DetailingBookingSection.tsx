"use client";

import EnquiryForm from "@/components/EnquiryForm";
import SectionHeading from "@/components/SectionHeading";
import FadeInSection from "@/components/car-detailing/FadeInSection";
import { cn } from "@/lib/utils";
import { videoPanel, videoSurfaceMuted } from "@/lib/video-page-styles";

export default function DetailingBookingSection() {
  return (
    <section id="book-detailing" className="scroll-mt-24 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <FadeInSection>
            <SectionHeading
              title="Book a Detail"
              subtitle="Request a free quote or schedule your detailing appointment"
              align="left"
            />
            <p className={videoSurfaceMuted + " leading-relaxed"}>
              Tell us about your vehicle and the services you&apos;re interested in. Our detailing
              team will get back to you with availability and pricing — usually within 24 hours.
            </p>
            <ul className={cn("mt-6 space-y-3 text-sm", videoSurfaceMuted)}>
              {[
                "Interior & exterior packages",
                "Paint correction & ceramic coating",
                "Utes, SUVs, sedans & commercial vehicles",
                "Darwin pickup by appointment",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </FadeInSection>

          <FadeInSection delay={0.15}>
            <div className={cn(videoPanel, "border-gray-200 bg-white")}>
              <h3 className="mb-1 text-xl font-bold text-gray-900">Get Your Free Quote</h3>
              <p className="mb-6 text-sm text-gray-600">Fill in your details and we&apos;ll be in touch shortly.</p>
              <EnquiryForm type="service-booking" compact />
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}
