"use client";

import SectionHeading from "@/components/SectionHeading";
import DetailingServiceCard from "@/components/car-detailing/DetailingServiceCard";
import { detailingServices } from "@/data/car-detailing";
import FadeInSection from "@/components/car-detailing/FadeInSection";

export default function DetailingServicesSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <SectionHeading
            title="Our Detailing Services"
            subtitle="Professional treatments for every part of your vehicle"
          />
        </FadeInSection>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {detailingServices.map((service, index) => (
            <DetailingServiceCard key={service.id} {...service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
