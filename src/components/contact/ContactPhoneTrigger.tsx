"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { Copy, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard, normalizePhoneForDial } from "@/lib/contact-actions";
import { cn } from "@/lib/utils";

type ContactPhoneTriggerProps = {
  phone: string;
  children: ReactNode;
  className?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  asChild?: boolean;
};

export default function ContactPhoneTrigger({
  phone,
  children,
  className,
  dialogTitle = "Call us",
  dialogDescription = "Copy the number or dial from your phone. This avoids the browser application picker.",
  asChild = false,
}: ContactPhoneTriggerProps) {
  const [copied, setCopied] = useState(false);
  const dialNumber = normalizePhoneForDial(phone);

  async function handleCopy() {
    await copyTextToClipboard(phone);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const trigger = asChild ? (
    children
  ) : (
    <button type="button" className={cn("text-left", className)}>
      {children}
    </button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger as ReactElement}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-lg font-semibold tracking-wide">
            {phone}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy number"}
            </Button>
            <Button type="button" asChild>
              <a href={`tel:${dialNumber}`}>Dial on this device</a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
