import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "@/providers/Providers";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { siteConfig } from "@/data/services";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} – ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    `Everest Car Rental offers a wide range of vehicles for rent at ${siteConfig.location} and across the Northern Territory at competitive prices.`,
  keywords: [
    "car rental Darwin",
    "rent a car Darwin",
    "Everest Car Rental",
    "Everest Rental",
    "vehicle hire NT",
  ],
  openGraph: {
    title: `${siteConfig.name} – ${siteConfig.tagline}`,
    description: `Hassle-free car rental at ${siteConfig.location}.`,
    type: "website",
    locale: "en_AU",
    siteName: siteConfig.name,
  },
  icons: {
    icon: [
      { url: siteConfig.logo.favicon, sizes: "32x32", type: "image/png" },
      { url: siteConfig.logo.appleTouchIcon, sizes: "192x192", type: "image/png" },
    ],
    apple: siteConfig.logo.appleTouchIcon,
    shortcut: siteConfig.logo.favicon,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
