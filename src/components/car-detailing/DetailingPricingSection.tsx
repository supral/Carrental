"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import FadeInSection from "@/components/car-detailing/FadeInSection";
import { detailingPricing } from "@/data/car-detailing";

export default function DetailingPricingSection() {
  return (
    <section className="bg-gray-50 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <p className="text-center text-sm font-medium uppercase tracking-widest text-gray-500">
            Prices Starting From
          </p>
        </FadeInSection>

        <div className="mt-10 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 divide-y divide-gray-200 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            {detailingPricing.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className={`relative flex flex-col p-6 sm:p-8 ${
                  "featured" in plan && plan.featured ? "bg-red-50/40" : ""
                }`}
              >
                <div
                  className={`absolute left-0 top-0 h-10 w-10 overflow-hidden ${plan.accentClass}`}
                  style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                  aria-hidden
                />

                <h3 className="mt-2 text-lg font-bold text-gray-900">{plan.title}</h3>

                {plan.price !== null ? (
                  <p className="mt-3 text-4xl font-bold text-red-600">
                    ${plan.price}
                  </p>
                ) : (
                  <p className="mt-3 text-lg font-semibold text-gray-600">Quote on request</p>
                )}

                <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-red-600">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="#book-detailing"
                  className="mt-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  {plan.price !== null ? "Book This Package" : "Get a Quote"}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Prices may vary depending on vehicle size and condition. Contact us for a personalised quote.
        </p>
      </div>
    </section>
  );
}
