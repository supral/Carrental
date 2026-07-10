import { FormField, FormType } from "@/types";

export const formConfigs: Record<FormType, { title: string; subtitle: string; fields: FormField[] }> = {
  "vehicle-enquiry": {
    title: "Vehicle Enquiry",
    subtitle: "Interested in this vehicle? Send us an enquiry and we'll be in touch shortly.",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, placeholder: "John Smith" },
      { name: "email", label: "Email", type: "email", required: true, placeholder: "john@email.com" },
      { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "04XX XXX XXX" },
      { name: "message", label: "Message", type: "textarea", required: false, placeholder: "I'd like to arrange a test drive..." },
    ],
  },
  contact: {
    title: "Contact Us",
    subtitle: "Have a question? We'd love to hear from you.",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, placeholder: "John Smith" },
      { name: "email", label: "Email", type: "email", required: true, placeholder: "john@email.com" },
      { name: "phone", label: "Phone", type: "tel", required: false, placeholder: "04XX XXX XXX" },
      {
        name: "subject",
        label: "Subject",
        type: "select",
        required: true,
        options: [
          { value: "general", label: "General Enquiry" },
          { value: "sell", label: "Sell My Car" },
          { value: "finance", label: "Finance" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "message", label: "Message", type: "textarea", required: true, placeholder: "How can we help?" },
    ],
  },
  "auto-parts": {
    title: "Auto Parts Enquiry",
    subtitle: "Need a part? Tell us what you're looking for and we'll source it for you.",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, placeholder: "John Smith" },
      { name: "email", label: "Email", type: "email", required: true, placeholder: "john@email.com" },
      { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "04XX XXX XXX" },
      { name: "vehicleMake", label: "Vehicle Make", type: "text", required: true, placeholder: "Toyota" },
      { name: "vehicleModel", label: "Vehicle Model", type: "text", required: true, placeholder: "Hilux" },
      { name: "vehicleYear", label: "Vehicle Year", type: "number", required: false, placeholder: "2020" },
      { name: "partDescription", label: "Part Description", type: "textarea", required: true, placeholder: "Describe the part you need..." },
    ],
  },
  "car-rental": {
    title: "Car Rental Enquiry",
    subtitle: "Book your rental vehicle and we'll confirm availability.",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, placeholder: "John Smith" },
      { name: "email", label: "Email", type: "email", required: true, placeholder: "john@email.com" },
      { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "04XX XXX XXX" },
      { name: "address", label: "Address", type: "text", required: true, placeholder: "Street address" },
      { name: "zip", label: "ZIP / Postcode", type: "text", required: true, placeholder: "e.g. 0800" },
      { name: "dob", label: "Date of Birth", type: "date", required: true },
      { name: "country", label: "Country", type: "text", required: true, placeholder: "Australia" },
      {
        name: "vehicleType",
        label: "Vehicle Type",
        type: "select",
        required: true,
        options: [
          { value: "sedan", label: "Sedan" },
          { value: "suv", label: "SUV" },
          { value: "ute", label: "Ute / 4WD" },
          { value: "van", label: "Van" },
        ],
      },
      { name: "pickupDate", label: "Pickup Date", type: "date", required: true },
      { name: "returnDate", label: "Return Date", type: "date", required: true },
      { name: "message", label: "Additional Notes", type: "textarea", required: false, placeholder: "Any special requirements..." },
    ],
  },
  "service-booking": {
    title: "Service Booking",
    subtitle: "Book your vehicle in for servicing or repairs.",
    fields: [
      { name: "name", label: "Full Name", type: "text", required: true, placeholder: "John Smith" },
      { name: "email", label: "Email", type: "email", required: true, placeholder: "john@email.com" },
      { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "04XX XXX XXX" },
      { name: "vehicleMake", label: "Vehicle Make", type: "text", required: true, placeholder: "Toyota" },
      { name: "vehicleModel", label: "Vehicle Model", type: "text", required: true, placeholder: "Camry" },
      {
        name: "serviceType",
        label: "Service Type",
        type: "select",
        required: true,
        options: [
          { value: "logbook", label: "Logbook Service" },
          { value: "repair", label: "General Repair" },
          { value: "tyres", label: "Tyres & Wheels" },
          { value: "inspection", label: "Pre-Purchase Inspection" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "preferredDate", label: "Preferred Date", type: "date", required: true },
      { name: "message", label: "Additional Details", type: "textarea", required: false, placeholder: "Describe any issues or requirements..." },
    ],
  },
};
