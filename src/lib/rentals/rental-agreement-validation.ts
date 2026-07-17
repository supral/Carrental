import { randomBytes } from "crypto";
import { z } from "zod";

export function createAgreementToken(): string {
  return randomBytes(32).toString("hex");
}

export const agreementTermsSchema = z.object({
  rentalTerms: z.literal(true),
  insuranceExcess: z.literal(true),
  fuelPolicy: z.literal(true),
  extraKilometres: z.literal(true),
  lateReturnCharges: z.literal(true),
  damagePolicy: z.literal(true),
});

export const rentalDriverSchema = z.object({
  isPrimary: z.boolean().default(false),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  phone: z.string().trim().min(6, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
  emergencyPhone: z.string().trim().optional(),
  licenceNumber: z.string().trim().min(3, "Licence number is required"),
  licenceExpiry: z.string().min(1, "Licence expiry is required"),
  licenceFrontUrl: z.string().min(1, "Licence front image is required"),
  licenceBackUrl: z.string().min(1, "Licence back image is required"),
  signatureDataUrl: z.string().min(20, "Signature is required"),
});

export const customerAgreementFormSchema = z
  .object({
    driverCount: z.number().int().min(1).max(4),
    drivers: z.array(rentalDriverSchema).min(1).max(4),
    terms: agreementTermsSchema,
  })
  .superRefine((data, ctx) => {
    if (data.drivers.length !== data.driverCount) {
      ctx.addIssue({
        code: "custom",
        message: "Driver forms must match selected driver count",
        path: ["drivers"],
      });
    }
    const primaryCount = data.drivers.filter((d) => d.isPrimary).length;
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Exactly one primary driver is required",
        path: ["drivers"],
      });
    }
  });

export type CustomerAgreementFormInput = z.infer<typeof customerAgreementFormSchema>;

export const pickupChecklistSchema = z.object({
  fleetVehicleId: z.string().min(1),
  registrationNumber: z.string().trim().min(1, "Registration is required"),
  vinNumber: z.string().trim().min(1, "VIN is required"),
  color: z.string().trim().min(1, "Colour is required"),
  kmOut: z.number().int().min(0),
  expectedKmIn: z.number().int().min(0),
  fuelOut: z.string().min(1),
  timeOut: z.string().min(1),
  expectedReturnAt: z.string().min(1),
  dailyRateCents: z.number().int().min(0),
  dailyLimitKm: z.number().int().min(0),
  excessKmRateCents: z.number().int().min(0),
  bondCents: z.number().int().min(0),
  insuranceNotes: z.string().optional(),
  notes: z.string().optional(),
  adminSignatureDataUrl: z.string().min(20, "Admin signature is required"),
});

export const returnChecklistSchema = z.object({
  kmIn: z.number().int().min(0),
  fuelIn: z.string().min(1),
  returnedAt: z.string().min(1),
  damageNotes: z.string().optional(),
  damagePhotoUrls: z.array(z.string()).default([]),
  damageChargeCents: z.number().int().min(0).default(0),
  fuelChargeOverrideCents: z.number().int().min(0).optional(),
  accessoriesChecklist: z.record(z.string(), z.boolean()).optional(),
  adminSignatureDataUrl: z.string().min(20, "Admin signature is required"),
});

export type PickupChecklistInput = z.infer<typeof pickupChecklistSchema>;
export type ReturnChecklistInput = z.infer<typeof returnChecklistSchema>;
