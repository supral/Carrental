import { NotificationType, Role, UserStatus, type Lead } from "@prisma/client";
import { siteConfig } from "@/data/services";
import { sendEmail } from "@/lib/email";
import { formatLeadDetailsForEmail } from "@/lib/leads/lead-message";
import { getAppBaseUrl } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { FormType } from "@/types";

const FORM_LABELS: Record<FormType, string> = {
  contact: "Contact enquiry",
  "auto-parts": "Auto parts enquiry",
  "service-booking": "Service booking",
  "vehicle-enquiry": "Vehicle enquiry",
  "car-rental": "Car rental enquiry",
};

const PUBLIC_FORM_TYPES = new Set<FormType>([
  "contact",
  "auto-parts",
  "service-booking",
  "car-rental",
  "vehicle-enquiry",
]);

export function shouldNotifySuperAdminForForm(formType: FormType): boolean {
  return PUBLIC_FORM_TYPES.has(formType);
}

function getAdminBaseUrl(): string {
  return getAppBaseUrl();
}

function buildEmailContent(lead: Lead, formType: FormType, formData: Record<string, string>) {
  const label = FORM_LABELS[formType];
  const details = formatLeadDetailsForEmail(formData);
  const adminUrl = `${getAdminBaseUrl()}/admin/leads`;

  const text = [
    `A new ${label.toLowerCase()} was submitted on ${siteConfig.name}.`,
    "",
    "Customer contact details:",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.phone ? `Phone: ${lead.phone}` : null,
    "",
    details ? "Submission details:" : null,
    details || null,
    "",
    "Please contact the customer by email (or phone) to follow up.",
    `Reply to: ${lead.email}`,
    "",
    `View all leads: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px">
      <h2 style="margin:0 0 12px">New ${label}</h2>
      <p style="margin:0 0 16px">A customer submitted a form on <strong>${siteConfig.name}</strong>. Please follow up by email.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="padding:8px 0;font-weight:600;width:120px">Name</td><td>${lead.name}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Email</td><td><a href="mailto:${lead.email}">${lead.email}</a></td></tr>
        ${lead.phone ? `<tr><td style="padding:8px 0;font-weight:600">Phone</td><td>${lead.phone}</td></tr>` : ""}
      </table>
      ${
        details
          ? `<h3 style="margin:0 0 8px">Submission details</h3><pre style="background:#f3f4f6;padding:12px;border-radius:8px;white-space:pre-wrap">${details}</pre>`
          : ""
      }
      <p style="margin:20px 0 0">
        <a href="${adminUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">
          Open leads in admin
        </a>
      </p>
    </div>
  `;

  return { label, text, html };
}

export async function notifySuperAdminsOfNewLead(
  lead: Lead,
  formType: FormType,
  formData: Record<string, string>
): Promise<void> {
  if (!shouldNotifySuperAdminForForm(formType)) {
    return;
  }

  const { label, text, html } = buildEmailContent(lead, formType, formData);
  const title = `New ${label}`;
  const message = `${lead.name} submitted a ${label.toLowerCase()}. Contact them at ${lead.email}.`;

  try {
    const superAdmins = await prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE },
      select: { id: true, email: true },
    });

    if (superAdmins.length > 0) {
      await prisma.notification.createMany({
        data: superAdmins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.NEW_LEAD,
          title,
          message,
          link: `/admin/leads?lead=${lead.id}`,
        })),
      });
    }

    const recipients =
      superAdmins.length > 0
        ? superAdmins.map((admin) => admin.email)
        : [siteConfig.email];

    await sendEmail({
      to: recipients,
      subject: `[${siteConfig.name}] New ${label} from ${lead.name}`,
      text,
      html,
    });
  } catch (error) {
    console.error("[Lead notification]", error);
  }
}
