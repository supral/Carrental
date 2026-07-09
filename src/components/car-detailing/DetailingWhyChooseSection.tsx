"use client";

import {
  Award,
  Star,
  Wallet,
  Clock,
  Heart,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";
import FadeInSection from "@/components/car-detailing/FadeInSection";
import { detailingWhyChoose } from "@/data/car-detailing";

const iconMap: Record<string, LucideIcon> = {
  badge: Award,
  star: Star,
  wallet: Wallet,
  clock: Clock,
  heart: Heart,
  wrench: Wrench,
};

export default function DetailingWhyChooseSection() {
  return (
    <section className="bg-gray-50 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <SectionHeading
            title="Why Choose Everest Car Rental"
            subtitle="Trusted detailing with results you can see and feel"
          />
        </FadeInSection>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {detailingWhyChoose.map((item, index) => {
            const Icon = iconMap[item.icon] || Star;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -4 }}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-red-200 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
