"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import FadeInSection from "@/components/car-detailing/FadeInSection";
import { detailingBlogs } from "@/data/car-detailing";

export default function DetailingBlogSection() {
  return (
    <section className="bg-gray-50 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <SectionHeading
            title="Latest Blogs"
            subtitle="Tips, guides, and insights on keeping your car looking its best"
          />
        </FadeInSection>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {detailingBlogs.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:border-red-200 hover:shadow-xl"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <time className="text-xs font-medium uppercase tracking-wide text-red-600">
                  {format(new Date(post.date), "dd MMM yyyy")}
                </time>
                <h3 className="mt-2 text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-3">
                  {post.excerpt}
                </p>
                <Link
                  href={post.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-red-600 transition-all group-hover:gap-2"
                >
                  Read More
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
