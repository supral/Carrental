"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import FadeInSection from "@/components/car-detailing/FadeInSection";
import { detailingStats } from "@/data/car-detailing";

export default function DetailingStatsBanner() {
  return (
    <section className="relative -mt-4 pb-16 lg:pb-20">
      <div className="absolute left-0 top-1/2 hidden -translate-y-1/2 lg:block">
        <div className="grid grid-cols-4 gap-3 px-4 opacity-40">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-red-400" />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div
            className="relative overflow-hidden bg-gray-900 px-8 py-12 sm:px-12 sm:py-14 lg:px-16"
            style={{ clipPath: "polygon(0 0, 96% 0, 100% 100%, 0 100%)" }}
          >
            <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-center sm:justify-between">
              {detailingStats.map((stat, index) => (
                <Fragment key={stat.label}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, delay: index * 0.1 }}
                    className="relative flex-1 text-center sm:text-left"
                  >
                    <span
                      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-7xl font-bold text-white/5 sm:left-0 sm:translate-x-0 sm:text-8xl"
                      aria-hidden
                    >
                      {stat.value}
                    </span>
                    <p className="relative text-5xl font-bold text-red-400 sm:text-6xl">{stat.value}</p>
                    <p className="relative mt-2 text-sm font-medium text-white sm:text-base">{stat.label}</p>
                  </motion.div>

                  {index < detailingStats.length - 1 && (
                    <span className="hidden h-3 w-3 shrink-0 bg-red-400 sm:block" aria-hidden />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
