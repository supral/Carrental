import type { FormType } from "@/types";

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  message: "Message",
  subject: "Subject",
  vehicleMake: "Vehicle make",
  vehicleModel: "Vehicle model",
  vehicleYear: "Vehicle year",
  partDescription: "Part description",
  makeModel: "Make / model",
  registrationNo: "Registration",
  mileage: "Mileage",
  bestDate: "Preferred date",
  bestTime: "Preferred time",
  serviceType: "Service type",
  preferredDate: "Preferred date",
  vehicleInfo: "Vehicle",
};

export function buildLeadMessage(formType: FormType, data: Record<string, string>): string | null {
  const lines: string[] = [];

  if (data.message?.trim()) {
    lines.push(data.message.trim());
  }

  if (data.subject?.trim()) {
    lines.push(`Subject: ${data.subject.trim()}`);
  }

  if (data.partDescription?.trim()) {
    lines.push(`Part needed: ${data.partDescription.trim()}`);
  }

  if (data.makeModel?.trim()) {
    lines.push(`Vehicle: ${data.makeModel.trim()}`);
  } else if (data.vehicleMake?.trim() || data.vehicleModel?.trim()) {
    const vehicle = [data.vehicleYear, data.vehicleMake, data.vehicleModel].filter(Boolean).join(" ");
    lines.push(`Vehicle: ${vehicle.trim()}`);
  }

  if (data.registrationNo?.trim()) {
    lines.push(`Registration: ${data.registrationNo.trim()}`);
  }

  if (data.mileage?.trim()) {
    lines.push(`Mileage: ${data.mileage.trim()}`);
  }

  if (data.bestDate?.trim()) {
    const time = data.bestTime?.trim() ? ` at ${data.bestTime.trim()}` : "";
    lines.push(`Preferred appointment: ${data.bestDate.trim()}${time}`);
  } else if (data.preferredDate?.trim()) {
    lines.push(`Preferred date: ${data.preferredDate.trim()}`);
  }

  if (data.serviceType?.trim()) {
    lines.push(`Service type: ${data.serviceType.trim()}`);
  }

  if (lines.length > 0) {
    return lines.join("\n");
  }

  const skip = new Set(["name", "email", "phone", "formType"]);
  const extras = Object.entries(data)
    .filter(([key, value]) => !skip.has(key) && value?.trim())
    .map(([key, value]) => `${FIELD_LABELS[key] ?? key}: ${value.trim()}`);

  return extras.length > 0 ? extras.join("\n") : null;
}

export function formatLeadDetailsForEmail(data: Record<string, string>): string {
  const skip = new Set(["formType"]);
  return Object.entries(data)
    .filter(([key, value]) => !skip.has(key) && value?.trim())
    .map(([key, value]) => `${FIELD_LABELS[key] ?? key}: ${value.trim()}`)
    .join("\n");
}
