"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ContactEmailTrigger from "@/components/contact/ContactEmailTrigger";

type LeadRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  type: string;
  status: string;
  createdAt: string;
  data: unknown;
  vehicle: { title: string } | null;
  assignedTo: { name: string } | null;
};

function formatLeadData(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];

  const skip = new Set(["formType", "name", "email", "phone", "message", "subject"]);
  const labels: Record<string, string> = {
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

  return Object.entries(data as Record<string, unknown>)
    .filter(([key, value]) => !skip.has(key) && value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${labels[key] ?? key}: ${String(value)}`);
}

const statusColor: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-purple-100 text-purple-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  QUALIFIED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
  LOST: "bg-red-100 text-red-800",
};

export default function AdminLeadsList({ leads }: { leads: LeadRecord[] }) {
  if (leads.length === 0) {
    return <p className="text-center text-muted-foreground py-12">No leads yet.</p>;
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => {
        const extraDetails = formatLeadData(lead.data);
        const enquiryType = lead.type.replace(/_/g, " ").toLowerCase();
        const emailSubject = `Re: Your ${enquiryType} enquiry`;
        const emailBody = [
          `Hi ${lead.name},`,
          "",
          `Thank you for your ${enquiryType} enquiry with Everest Car Rental.`,
          lead.message ? `\nYour message:\n${lead.message}` : "",
          "",
          "Kind regards,",
          "Everest Car Rental Team",
        ]
          .filter((line) => line !== undefined)
          .join("\n");

        return (
          <div key={lead.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold">{lead.name}</h3>
                  <Badge className={statusColor[lead.status]}>{lead.status}</Badge>
                  <Badge variant="outline">{lead.type.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <ContactEmailTrigger
                    email={lead.email}
                    subject={emailSubject}
                    body={emailBody}
                    dialogTitle="Email customer"
                    deliveryMode="smtp"
                    className="text-primary hover:underline"
                  >
                    {lead.email}
                  </ContactEmailTrigger>
                  {lead.phone && ` · ${lead.phone}`}
                </p>
                {lead.message && <p className="text-sm mt-2 whitespace-pre-wrap">{lead.message}</p>}
                {extraDetails.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {extraDetails.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                {lead.vehicle && <p className="text-sm text-primary mt-2">Re: {lead.vehicle.title}</p>}
                <div className="mt-4">
                  <ContactEmailTrigger
                    email={lead.email}
                    subject={emailSubject}
                    body={emailBody}
                    dialogTitle="Email customer"
                    deliveryMode="smtp"
                    asChild
                  >
                    <Button type="button">Email customer</Button>
                  </ContactEmailTrigger>
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-right shrink-0">
                <p>{format(new Date(lead.createdAt), "dd MMM yyyy HH:mm")}</p>
                {lead.assignedTo && <p>Assigned: {lead.assignedTo.name}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
