import type { FormType } from "@/types";
import type { LeadType } from "@prisma/client";

export const FORM_TYPES: FormType[] = [
  "vehicle-enquiry",
  "contact",
  "auto-parts",
  "car-rental",
  "service-booking",
];

const FORM_TO_LEAD_TYPE: Record<FormType, LeadType> = {
  "vehicle-enquiry": "VEHICLE_ENQUIRY",
  contact: "CONTACT",
  "auto-parts": "AUTO_PARTS",
  "car-rental": "CAR_RENTAL",
  "service-booking": "SERVICE_BOOKING",
};

export function formTypeToLeadType(formType: FormType): LeadType {
  return FORM_TO_LEAD_TYPE[formType];
}

export function isFormType(value: string): value is FormType {
  return FORM_TYPES.includes(value as FormType);
}
