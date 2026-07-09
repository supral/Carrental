"use client";

import VideoPageShell from "@/components/layout/VideoPageShell";
import DetailingHero from "@/components/car-detailing/DetailingHero";
import DetailingFeaturedServicesSection from "@/components/car-detailing/DetailingFeaturedServicesSection";
import DetailingServicesSection from "@/components/car-detailing/DetailingServicesSection";
import DetailingPricingSection from "@/components/car-detailing/DetailingPricingSection";
import DetailingWorkProcessSection from "@/components/car-detailing/DetailingWorkProcessSection";
import DetailingStatsBanner from "@/components/car-detailing/DetailingStatsBanner";
import DetailingWhyChooseSection from "@/components/car-detailing/DetailingWhyChooseSection";
import DetailingCtaBanner from "@/components/car-detailing/DetailingCtaBanner";
import DetailingBlogSection from "@/components/car-detailing/DetailingBlogSection";
import DetailingBookingSection from "@/components/car-detailing/DetailingBookingSection";

export default function CarDetailingPageContent() {
  return (
    <VideoPageShell variant="detailing">
      <DetailingHero />
      <DetailingFeaturedServicesSection />
      <DetailingServicesSection />
      <DetailingPricingSection />
      <DetailingWorkProcessSection />
      <DetailingStatsBanner />
      <DetailingWhyChooseSection />
      <DetailingCtaBanner />
      <DetailingBlogSection />
      <DetailingBookingSection />
    </VideoPageShell>
  );
}
