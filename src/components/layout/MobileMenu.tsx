"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { mainNavLinks } from "@/data/navigation";
import NavItem from "@/components/layout/NavItem";
import ActionButtons from "@/components/layout/ActionButtons";
import SocialLinks from "@/components/layout/SocialLinks";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
  search: string;
}

export default function MobileMenu({ open, onClose, pathname, search }: MobileMenuProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm xl:hidden"
            onClick={onClose}
            aria-label="Close menu overlay"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[100] flex h-[100dvh] w-full max-w-sm flex-col bg-white shadow-2xl xl:hidden"
            aria-label="Mobile navigation"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
              <span className="text-lg font-bold text-gray-900">Menu</span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <ul className="space-y-1">
                {mainNavLinks.map((link) => (
                  <li key={link.href}>
                    <NavItem
                      href={link.href}
                      label={link.label}
                      pathname={pathname}
                      search={search}
                      onClick={onClose}
                      className="block w-full rounded-lg px-3 py-3 text-base"
                    />
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-auto shrink-0 space-y-4 border-t border-gray-200 bg-white px-5 py-5">
              <ActionButtons
                compact
                className="w-full flex-col gap-3 [&>a]:w-full [&>a]:justify-center"
              />
              <SocialLinks
                className="justify-center"
                iconClassName="h-5 w-5"
                linkClassName="text-gray-500"
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
