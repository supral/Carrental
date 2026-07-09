import Link from "next/link";
import Image from "next/image";
import type { PublicDealerProfile } from "@/lib/dealers/dealer-service";
import { siteConfig } from "@/data/services";
import ContactPhoneTrigger from "@/components/contact/ContactPhoneTrigger";

export default function DealerSiteHeader({ dealer }: { dealer: PublicDealerProfile }) {
  const nav = [
    { href: `/dealers/${dealer.slug}`, label: "Home" },
    { href: `/dealers/${dealer.slug}/vehicles`, label: "Vehicles" },
    { href: `/dealers/${dealer.slug}/contact`, label: "Contact" },
  ];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs text-gray-600 sm:px-6">
          <Link href="/" className="hover:text-gray-900">
            ← {siteConfig.name} Marketplace
          </Link>
          <ContactPhoneTrigger phone={dealer.phone} className="font-medium hover:text-gray-900">
            {dealer.phone}
          </ContactPhoneTrigger>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={`/dealers/${dealer.slug}`} className="flex items-center gap-3 min-w-0">
          {dealer.logo ? (
            <Image
              src={dealer.logo}
              alt={dealer.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-contain"
              unoptimized
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
              style={{ backgroundColor: dealer.primaryColor }}
            >
              {dealer.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-gray-900">{dealer.name}</p>
            {dealer.tagline && (
              <p className="truncate text-sm text-gray-500">{dealer.tagline}</p>
            )}
          </div>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
              style={{ ["--dealer-accent" as string]: dealer.primaryColor }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
