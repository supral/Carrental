"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { mainNavLinks } from "@/data/navigation";
import TopBar from "@/components/layout/TopBar";
import Navbar from "@/components/layout/Navbar";
import DesktopNav, { DesktopNavFallback } from "@/components/layout/DesktopNav";
import MobileMenuWithSearch from "@/components/layout/MobileMenuWithSearch";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-gray-200/80 bg-white/95 shadow-md shadow-gray-900/5 backdrop-blur-md"
          : "border-b border-transparent bg-white"
      )}
    >
      <TopBar />
      <Navbar scrolled={scrolled} onOpenMobile={() => setMobileOpen(true)}>
        <Suspense fallback={<DesktopNavFallback links={mainNavLinks} />}>
          <DesktopNav links={mainNavLinks} pathname={pathname} />
        </Suspense>
      </Navbar>
      <Suspense fallback={null}>
        <MobileMenuWithSearch
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          pathname={pathname}
        />
      </Suspense>
    </header>
  );
}
