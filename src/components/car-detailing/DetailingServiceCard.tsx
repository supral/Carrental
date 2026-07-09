"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Droplets,
  Sofa,
  Sparkles,
  Shield,
  Cog,
  Lightbulb,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  droplets: Droplets,
  sofa: Sofa,
  sparkles: Sparkles,
  shield: Shield,
  cog: Cog,
  lightbulb: Lightbulb,
};

interface DetailingServiceCardProps {
  title: string;
  description: string;
  image: string;
  icon: string;
  index: number;
}

export default function DetailingServiceCard({
  title,
  description,
  image,
  icon,
  index,
}: DetailingServiceCardProps) {
  const Icon = iconMap[icon] || Sparkles;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -6 }}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:border-red-200 hover:shadow-xl"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white shadow-lg">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
        <Link
          href="#book-detailing"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-red-600 transition-all group-hover:gap-2"
        >
          Learn More
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  );
}
