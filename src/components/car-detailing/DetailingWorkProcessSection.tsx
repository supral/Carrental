"use client";

import { Fragment } from "react";
import { ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";
import FadeInSection from "@/components/car-detailing/FadeInSection";
import ProcessStepIllustration from "@/components/car-detailing/ProcessStepIllustration";
import { detailingWorkProcess } from "@/data/car-detailing";

export default function DetailingWorkProcessSection() {
  return (
    <section className="pb-8 pt-16 lg:pb-10 lg:pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-red-400">
            Our Work Process
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-center text-3xl font-bold text-white drop-shadow-sm sm:text-4xl">
            Easy steps for a clean inside &amp; outside.
          </h2>
        </FadeInSection>

        <div className="mt-14 flex flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-2">
          {detailingWorkProcess.map((item, index) => (
            <Fragment key={item.step}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
                className="flex w-full max-w-xs flex-col items-center text-center lg:max-w-[220px] lg:flex-1"
              >
                <div className="mb-6 flex h-40 w-full items-center justify-center rounded-xl bg-gray-50 px-4">
                  <ProcessStepIllustration variant={item.illustration} />
                </div>
                <p className="text-4xl font-bold text-red-400 sm:text-5xl">{item.step}.</p>
                <h3 className="mt-2 text-base font-bold text-white sm:text-lg">{item.title}</h3>
              </motion.div>

              {index < detailingWorkProcess.length - 1 && (
                <ChevronsRight
                  className="hidden shrink-0 text-white/40 lg:mt-16 lg:block lg:h-7 lg:w-7"
                  strokeWidth={1.5}
                  aria-hidden
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
