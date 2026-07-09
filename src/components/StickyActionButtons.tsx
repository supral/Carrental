"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, Check, Copy, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteConfig } from "@/data/services";
import { copyPhoneNumber, formatPhoneTelHref, isMobileUserAgent } from "@/lib/phone";

export default function StickyActionButtons() {
  const [callOpen, setCallOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const phoneHref = formatPhoneTelHref(siteConfig.phone);
  const siteName = siteConfig.name;

  const handleCallClick = () => {
    if (isMobileUserAgent()) {
      window.location.href = phoneHref;
      return;
    }
    setCopied(false);
    setCallOpen(true);
  };

  const handleCopyNumber = async () => {
    const ok = await copyPhoneNumber(siteConfig.phone);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col overflow-hidden rounded-l-xl shadow-xl"
        aria-label="Quick actions"
      >
        <Link
          href="/my-bookings"
          className="group flex w-14 flex-col items-center justify-center gap-1.5 bg-primary px-2 py-4 text-white transition-colors hover:opacity-90 sm:w-16 sm:py-5"
        >
          <CalendarCheck className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden />
          <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs">
            My
            <br />
            Status
          </span>
        </Link>
        <button
          type="button"
          onClick={handleCallClick}
          className="group flex w-14 flex-col items-center justify-center gap-1.5 border-t border-white/20 bg-gray-900 px-2 py-4 text-white transition-colors hover:bg-gray-800 sm:w-16 sm:py-5"
          aria-label={`Call ${siteConfig.phone}`}
        >
          <Phone className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden />
          <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs">
            Call
          </span>
        </button>
      </div>

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Call {siteName}</DialogTitle>
            <DialogDescription>
              Speak with our team about vehicles, rentals, servicing, or your booking.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm font-medium text-gray-600">{siteConfig.location}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-primary">{siteConfig.phone}</p>
            <p className="mt-3 text-xs text-gray-500">{siteConfig.hours.weekdays}</p>
            <p className="mt-4 text-sm text-gray-600">
              Dial this number from your phone, or copy it below.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCopyNumber}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Number
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCallOpen(false)}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
