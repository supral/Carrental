"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageHero from "@/components/layout/PageHero";

export default function DetailingHero() {
  return (
    <PageHero
      padding="large"
      eyebrow="Everest Car Rental"
      title="Premium Car Detailing Services"
      description="Restore your vehicle's showroom shine with expert interior and exterior detailing, paint correction, and long-lasting protection — tailored for the Top End."
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center"
      >
        <Link
          href="#book-detailing"
          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-8 py-3.5 text-base font-semibold text-white"
        >
          Book Detailing
        </Link>
        <Link
          href="#book-detailing"
          className="inline-flex items-center justify-center rounded-lg border-2 border-white/80 px-8 py-3.5 text-base font-semibold text-white"
        >
          Get Free Quote
        </Link>
      </motion.div>
    </PageHero>
  );
}
