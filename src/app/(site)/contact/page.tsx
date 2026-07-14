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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8 xl:gap-10">
            <div className={videoPanel}>
              <ContactSection />
            </div>

            <div className={videoPanel}>
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Send a Message</h2>
                <p className="mt-2 text-sm text-gray-600 sm:text-base">
                  Ask about rentals, bookings, or anything else — we&apos;re happy to help.
                </p>
              </div>

              <EnquiryForm type="contact" compact />
            </div>
          </div>
        </div>
      </section>
    </VideoPageShell>
  );
}
