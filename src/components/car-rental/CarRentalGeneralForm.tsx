"use client";

import { useRef, useState, FormEvent, ChangeEvent } from "react";
import { submitForm, uploadLicencePhoto } from "@/lib/api";

export default function CarRentalGeneralForm({ className = "" }: { className?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [licencePreview, setLicencePreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLicenceChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLicenceFile(null);
      setLicencePreview(null);
      return;
    }
    setLicenceFile(file);
    if (file.type.startsWith("image/")) {
      setLicencePreview(URL.createObjectURL(file));
    } else {
      setLicencePreview(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") data[key] = value;
    });

    try {
      if (licenceFile) {
        data.licencePhotoUrl = await uploadLicencePhoto(licenceFile);
      }
      if (data.drivingLicenceNumber?.trim()) {
        data.drivingLicenceNumber = data.drivingLicenceNumber.trim().toUpperCase();
      } else {
        delete data.drivingLicenceNumber;
      }
      await submitForm("car-rental", data);
      setSubmitted(true);
      setLicenceFile(null);
      setLicencePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`rounded-xl border border-green-200 bg-green-50 p-8 text-center ${className}`}>
        <h3 className="mb-2 text-xl font-bold text-gray-900">Thank You!</h3>
        <p className="text-gray-600">Your rental enquiry has been received. We&apos;ll confirm availability shortly.</p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm font-medium text-primary hover:text-primary/80"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">Full Name *</label>
        <input id="name" name="name" type="text" required placeholder="John Smith" className={inputClass} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
          <input id="email" name="email" type="email" required placeholder="john@email.com" className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">Phone *</label>
          <input id="phone" name="phone" type="tel" required placeholder="04XX XXX XXX" className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="vehicleType" className="mb-1 block text-sm font-medium text-gray-700">Vehicle Type *</label>
        <select id="vehicleType" name="vehicleType" required className={`${inputClass} bg-white`}>
          <option value="">Select...</option>
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
          <option value="ute">Ute / 4WD</option>
          <option value="van">Van</option>
        </select>
      </div>
      <div>
        <label htmlFor="drivingLicenceNumber" className="mb-1 block text-sm font-medium text-gray-700">Driving Licence Number (optional)</label>
        <input id="drivingLicenceNumber" name="drivingLicenceNumber" type="text" className={`${inputClass} uppercase`} />
      </div>
      <div>
        <label htmlFor="licencePhoto" className="mb-1 block text-sm font-medium text-gray-700">Driving Licence Photo (optional)</label>
        <input
          ref={fileInputRef}
          id="licencePhoto"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleLicenceChange}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
        />
        {licencePreview && <img src={licencePreview} alt="Licence preview" className="mt-3 h-28 rounded-lg border object-cover" />}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pickupDate" className="mb-1 block text-sm font-medium text-gray-700">Pickup Date *</label>
          <input id="pickupDate" name="pickupDate" type="date" required min={today} className={inputClass} />
        </div>
        <div>
          <label htmlFor="returnDate" className="mb-1 block text-sm font-medium text-gray-700">Return Date *</label>
          <input id="returnDate" name="returnDate" type="date" required min={today} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">Additional Notes</label>
        <textarea id="message" name="message" rows={3} className={`${inputClass} resize-none`} />
      </div>
      {error && <div className="rounded-lg border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">{error}</div>}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:opacity-90 disabled:opacity-60">
        {loading ? "Sending..." : "Submit Enquiry"}
      </button>
    </form>
  );
}
