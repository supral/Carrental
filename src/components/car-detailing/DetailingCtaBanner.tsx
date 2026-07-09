"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import FadeInSection from "@/components/car-detailing/FadeInSection";

export default function DetailingCtaBanner() {
  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="relative overflow-hidden rounded-2xl bg-gray-900 shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1520340356584-1fc950effda2?w=1600&q=80"
              alt=""
              fill
              className="object-cover opacity-30"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/90 to-gray-900/70" />
            <div className="relative px-8 py-14 text-center sm:px-12 lg:py-16 lg:text-left">
              <div className="mx-auto max-w-3xl lg:mx-0">
                <p className="text-sm font-semibold uppercase tracking-widest text-red-400">
                  Ready for a showroom finish?
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                  Book your detailing appointment today
                </h2>
                <p className="mt-4 text-lg text-gray-300">
                  From quick refreshes to full paint correction and ceramic protection — our team
                  will recommend the perfect package for your vehicle.
                </p>
                <motion.div
                  className="mt-8 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start"
                  whileHover={{ scale: 1 }}
                >
                  <Link
                    href="#book-detailing"
                    className="inline-flex items-center justify-center rounded-lg bg-red-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Book Detailing Now
                  </Link>
                  <a
                    href="tel:0889470556"
                    className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Call 08 8947 0556
                  </a>
                </motion.div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
