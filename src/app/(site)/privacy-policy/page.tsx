import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/layout/PageHero";
import { privacyPolicySections } from "@/data/privacy-policy";
import { siteConfig } from "@/data/services";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Read the ${siteConfig.name} privacy policy for information about how we collect, use, and protect your personal information.`,
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero
        padding="large"
        eyebrow={siteConfig.name}
        title="Privacy Policy"
        description="How we collect, use, and protect your personal information."
        className="bg-brand-dark text-white"
      />

      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {privacyPolicySections.map((section) => (
              <article key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{section.title}</h2>

                <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-600 sm:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}

                  {"contactEmail" in section && section.contactEmail ? (
                    <p>
                      <Link href={`mailto:${siteConfig.email}`} className="font-medium text-primary hover:underline">
                        {siteConfig.email}
                      </Link>
                    </p>
                  ) : null}

                  {"list" in section && section.list ? (
                    <ul className="list-disc space-y-2 pl-5">
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}

                  {"footer" in section && section.footer ? <p>{section.footer}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
