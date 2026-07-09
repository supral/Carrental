export function buildGmailComposeUrl(options: {
  to: string;
  subject?: string;
  body?: string;
}) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: options.to,
  });

  if (options.subject) params.set("su", options.subject);
  if (options.body) params.set("body", options.body);

  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function buildOutlookComposeUrl(options: {
  to: string;
  subject?: string;
  body?: string;
}) {
  const params = new URLSearchParams({ to: options.to });
  if (options.subject) params.set("subject", options.subject);
  if (options.body) params.set("body", options.body);

  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
}

export function normalizePhoneForDial(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
