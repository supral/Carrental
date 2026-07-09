import Link from "next/link";
import type { PublicDealerProfile } from "@/lib/dealers/dealer-service";
import { siteConfig } from "@/data/services";
import ContactEmailTrigger from "@/components/contact/ContactEmailTrigger";
import ContactPhoneTrigger from "@/components/contact/ContactPhoneTrigger";

export default function DealerSiteFooter({ dealer }: { dealer: PublicDealerProfile }) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-gray-900">{dealer.name}</p>
            <p className="text-sm text-gray-600">{dealer.address}</p>
            <p className="text-sm text-gray-600">
              <ContactEmailTrigger email={dealer.email} className="hover:underline">
                {dealer.email}
              </ContactEmailTrigger>
              {" · "}
              <ContactPhoneTrigger phone={dealer.phone} className="hover:underline">
                {dealer.phone}
              </ContactPhoneTrigger>
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Powered by{" "}
            <Link href="/" className="font-medium text-gray-700 hover:underline">
              {siteConfig.name}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
