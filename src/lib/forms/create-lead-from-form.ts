import { prisma } from "@/lib/prisma";
import { buildLeadMessage } from "@/lib/leads/lead-message";
import { notifySuperAdminsOfNewLead } from "@/lib/leads/notify-super-admin-lead";
import type { FormType } from "@/types";
import { formTypeToLeadType } from "@/lib/forms/form-types";

export async function createLeadFromForm(
  formType: FormType,
  data: Record<string, string>
) {
  const message = buildLeadMessage(formType, data);

  const lead = await prisma.lead.create({
    data: {
      type: formTypeToLeadType(formType),
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      message,
      data: {
        formType,
        ...data,
      },
    },
  });

  await notifySuperAdminsOfNewLead(lead, formType, data);

  console.log(`[Lead] ${formType} from ${data.name} (${data.email})`);

  return lead;
}
