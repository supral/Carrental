"use client";

import { useSearchParams } from "next/navigation";
import MobileMenu from "@/components/layout/MobileMenu";

interface MobileMenuWithSearchProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

export default function MobileMenuWithSearch({
  open,
  onClose,
  pathname,
}: MobileMenuWithSearchProps) {
  const search = useSearchParams().toString();

  return <MobileMenu open={open} onClose={onClose} pathname={pathname} search={search} />;
}
