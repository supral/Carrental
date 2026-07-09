import type { FormType } from "@/types";

export interface FormValidationErrorDetail {
  field: string;
  message: string;
}

export class FormValidationError extends Error {
  status: number;
  errors: FormValidationErrorDetail[];

  constructor(message: string, errors: FormValidationErrorDetail[], status = 422) {
    super(message);
    this.name = "FormValidationError";
    this.status = status;
    this.errors = errors;
  }
}

const FORM_RULES: Record<
  FormType,
  { required: string[]; optional: string[] }
> = {
  "vehicle-enquiry": {
    required: ["name", "email", "phone"],
    optional: ["message", "vehicleInfo"],
  },
  contact: {
    required: ["name", "email", "subject", "message"],
    optional: ["phone"],
  },
  "auto-parts": {
    required: ["name", "email", "phone", "vehicleMake", "vehicleModel", "partDescription"],
    optional: ["vehicleYear"],
  },
  "car-rental": {
    required: ["name", "email", "phone", "pickupDate", "returnDate"],
    optional: ["message", "vehicleType", "vehicle", "vehicleInfo", "vehicleNumber", "drivingLicenceNumber", "licencePhotoUrl"],
  },
  "service-booking": {
    required: ["name", "email", "phone", "message"],
    optional: [
      "vehicleMake",
      "vehicleModel",
      "serviceType",
      "preferredDate",
      "makeModel",
      "registrationNo",
      "mileage",
      "bestDate",
      "bestTime",
    ],
  },
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateFormSubmission(
  formType: FormType,
  body: Record<string, unknown>
): Record<string, string> {
  const rules = FORM_RULES[formType];
  const errors: FormValidationErrorDetail[] = [];

  for (const field of rules.required) {
    const value = body[field];
    if (!value || String(value).trim() === "") {
      errors.push({ field, message: `${field} is required` });
    }
  }

  if (body.email && !isValidEmail(String(body.email))) {
    errors.push({ field: "email", message: "Invalid email address" });
  }

  if (formType === "car-rental" && body.pickupDate && body.returnDate) {
    const pickup = new Date(String(body.pickupDate));
    const returnDate = new Date(String(body.returnDate));
    if (returnDate < pickup) {
      errors.push({ field: "returnDate", message: "Return date must be after pickup date" });
    }
  }

  if (formType === "car-rental") {
    const hasVehicle =
      (body.vehicle && String(body.vehicle).trim()) ||
      (body.vehicleInfo && String(body.vehicleInfo).trim()) ||
      (body.vehicleType && String(body.vehicleType).trim());
    if (!hasVehicle) {
      errors.push({ field: "vehicle", message: "Please select or specify a vehicle" });
    }
  }

  if (formType === "service-booking") {
    const hasLegacyBooking =
      body.vehicleMake && body.vehicleModel && body.serviceType && body.preferredDate;
    const hasAutoCareBooking =
      body.makeModel && body.registrationNo && body.bestDate && body.bestTime;

    if (!hasLegacyBooking && !hasAutoCareBooking) {
      if (!body.makeModel && !(body.vehicleMake && body.vehicleModel)) {
        errors.push({ field: "makeModel", message: "Vehicle make/model is required" });
      }
      if (!body.registrationNo && body.makeModel) {
        errors.push({ field: "registrationNo", message: "Registration number is required" });
      }
      if (!body.bestDate && !body.preferredDate) {
        errors.push({ field: "bestDate", message: "Preferred date is required" });
      }
      if (!body.bestTime && body.makeModel) {
        errors.push({ field: "bestTime", message: "Preferred time is required" });
      }
      if (!body.serviceType && body.vehicleMake && !body.makeModel) {
        errors.push({ field: "serviceType", message: "Service type is required" });
      }
    }
  }

  if (errors.length > 0) {
    throw new FormValidationError("Validation failed", errors);
  }

  const allowed = new Set([...rules.required, ...rules.optional, "formType"]);
  const sanitized: Record<string, string> = {};

  for (const key of allowed) {
    if (body[key] !== undefined && body[key] !== "") {
      sanitized[key] = String(body[key]).trim();
    }
  }

  return sanitized;
}
