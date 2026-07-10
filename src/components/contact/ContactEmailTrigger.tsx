"use client";

import { useState, type ChangeEvent, type ReactElement, type ReactNode } from "react";
import { Copy, ExternalLink, Loader2, Mail, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  buildGmailComposeUrl,
  buildOutlookComposeUrl,
  copyTextToClipboard,
} from "@/lib/contact-actions";
import { cn } from "@/lib/utils";

type ContactEmailTriggerProps = {
  email: string;
  subject?: string;
  body?: string;
  children: ReactNode;
  className?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  asChild?: boolean;
  /** When "smtp", sends via the server (admin). Default opens Gmail/Outlook compose. */
  deliveryMode?: "compose" | "smtp";
};

export default function ContactEmailTrigger({
  email,
  subject = "",
  body = "",
  children,
  className,
  dialogTitle = "Send email",
  dialogDescription,
  asChild = false,
  deliveryMode = "compose",
}: ContactEmailTriggerProps) {
  const [open, setOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState(subject);
  const [draftBody, setDraftBody] = useState(body);
  const [copiedField, setCopiedField] = useState<"email" | "all" | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const resolvedDescription =
    dialogDescription ??
    (deliveryMode === "smtp"
      ? "Send an email from your Everest reservations inbox, or open Gmail or Outlook if you prefer."
      : "Choose how you would like to contact this address. This avoids the browser application picker.");

  async function handleCopy(field: "email" | "all") {
    const text =
      field === "email"
        ? email
        : [`To: ${email}`, draftSubject ? `Subject: ${draftSubject}` : "", draftBody]
            .filter(Boolean)
            .join("\n");

    await copyTextToClipboard(text);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 2000);
  }

  function openCompose(provider: "gmail" | "outlook") {
    const options = { to: email, subject: draftSubject, body: draftBody };
    const url =
      provider === "gmail" ? buildGmailComposeUrl(options) : buildOutlookComposeUrl(options);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSendViaSmtp() {
    if (!draftSubject.trim() || !draftBody.trim()) {
      setSendError("Subject and message are required.");
      return;
    }

    setSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const response = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: draftSubject.trim(),
          body: draftBody.trim(),
        }),
      });

      const result = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !result.success) {
        setSendError(result.error ?? "Failed to send email.");
        return;
      }

      setSendSuccess(true);
    } catch {
      setSendError("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const trigger = asChild ? (
    children
  ) : (
    <button type="button" className={cn("text-left", className)}>
      {children}
    </button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraftSubject(subject);
          setDraftBody(body);
          setSendError(null);
          setSendSuccess(false);
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>{trigger as ReactElement}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-email-to">To</Label>
            <Input id="contact-email-to" value={email} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email-subject">Subject</Label>
            <Input
              id="contact-email-subject"
              value={draftSubject}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setDraftSubject(event.target.value)
              }
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email-body">Message</Label>
            <textarea
              id="contact-email-body"
              value={draftBody}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDraftBody(event.target.value)
              }
              rows={5}
              placeholder="Write your message..."
              className="flex min-h-[120px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {sendError && <p className="text-sm text-destructive">{sendError}</p>}
          {sendSuccess && (
            <p className="text-sm text-green-700">Email sent successfully from reservations inbox.</p>
          )}

          <div className="flex flex-wrap gap-2">
            {deliveryMode === "smtp" && (
              <Button type="button" size="sm" onClick={handleSendViaSmtp} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending…" : "Send email"}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => handleCopy("email")}>
              <Copy className="h-4 w-4" />
              {copiedField === "email" ? "Copied" : "Copy email"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleCopy("all")}>
              <Copy className="h-4 w-4" />
              {copiedField === "all" ? "Copied" : "Copy details"}
            </Button>
            <Button type="button" variant={deliveryMode === "smtp" ? "outline" : "default"} size="sm" onClick={() => openCompose("gmail")}>
              <ExternalLink className="h-4 w-4" />
              Open Gmail
            </Button>
            <Button
              type="button"
              variant={deliveryMode === "smtp" ? "outline" : "secondary"}
              size="sm"
              onClick={() => openCompose("outlook")}
            >
              <ExternalLink className="h-4 w-4" />
              Open Outlook
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
