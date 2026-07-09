import type { Metadata } from "next";
import EnquiryForm from "@/components/EnquiryForm";
import ContactSection from "@/components/ContactSection";
import PageHero from "@/components/layout/PageHero";
import VideoPageShell from "@/components/layout/VideoPageShell";
import { siteConfig } from "@/data/services";
import { videoPanel } from "@/lib/video-page-styles";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${siteConfig.name}. Visit us at ${siteConfig.location} or call ${siteConfig.phone}.`,
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject } = await searchParams;
  const videoVariant = subject === "sell" ? "sale" : "home";

  return (
    <VideoPageShell variant={videoVariant}>
      <PageHero
        eyebrow={siteConfig.name}
        title="Contact Us"
        description="Have a question about your rental? Send us a message and we'll get back to you."
      />

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className={videoPanel}>
            <div className="mb-6 sm:mb-8 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Send a Message</h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Ask about rentals, bookings, or anything else — we&apos;re happy to help.
              </p>
            </div>

            <EnquiryForm type="contact" />
          </div>
        </div>
      </section>

      <ContactSection />
    </VideoPageShell>
  );
}
