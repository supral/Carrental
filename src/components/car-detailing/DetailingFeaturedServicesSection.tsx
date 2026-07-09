"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Car, Circle, SprayCan } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import FadeInSection from "@/components/car-detailing/FadeInSection";
import { detailingFeaturedServices } from "@/data/car-detailing";

const iconMap: Record<string, LucideIcon> = {
  wheel: Circle,
  spray: SprayCan,
  car: Car,
};

export default function DetailingFeaturedServicesSection() {
  return (
    <section className="bg-gray-50 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            Clean Cars. Good Service. Affordable Prices.
          </h2>
        </FadeInSection>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {detailingFeaturedServices.map((service, index) => {
            const Icon = iconMap[service.icon] || Car;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
              >
                <Link
                  href={service.href}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-xl shadow-md sm:aspect-[4/5]"
                >
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-400 text-red-400">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-xl font-bold text-white sm:text-2xl">{service.title}</h3>
                    <p className="mt-1 text-sm font-medium text-red-400">{service.subtitle}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
