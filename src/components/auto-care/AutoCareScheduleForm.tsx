"use client";

import { FormEvent, useState } from "react";
import { submitForm } from "@/lib/api";
import { LoadingLabel, LoadingOverlay } from "@/components/ui/loading";

export default function AutoCareScheduleForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === "string" && value.trim()) data[key] = value.trim();
    });

    try {
      await submitForm("service-booking", data);
      setSubmitted(true);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900">Request received</h3>
        <p className="mt-2 text-gray-600">
          We&apos;ve sent your request to our team. A super admin will contact you by email shortly to
          confirm your service appointment.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
        >
          Schedule another service
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20";

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4">
      <LoadingOverlay show={loading} label="Sending your request..." />
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
          Name <span className="text-red-600">*</span>
        </label>
        <input id="name" name="name" type="text" required className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email <span className="text-red-600">*</span>
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
            Phone <span className="text-red-600">*</span>
          </label>
          <input id="phone" name="phone" type="tel" required className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="makeModel" className="mb-1 block text-sm font-medium text-gray-700">
            Make/Model <span className="text-red-600">*</span>
          </label>
          <input
            id="makeModel"
            name="makeModel"
            type="text"
            required
            placeholder="e.g. Toyota Hilux"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="registrationNo" className="mb-1 block text-sm font-medium text-gray-700">
            Registration No <span className="text-red-600">*</span>
          </label>
          <input id="registrationNo" name="registrationNo" type="text" required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="mileage" className="mb-1 block text-sm font-medium text-gray-700">
          Mileage <span className="text-gray-400">(optional)</span>
        </label>
        <input id="mileage" name="mileage" type="text" placeholder="e.g. 85,000 km" className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bestDate" className="mb-1 block text-sm font-medium text-gray-700">
            Best Date <span className="text-red-600">*</span>
          </label>
          <input id="bestDate" name="bestDate" type="date" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="bestTime" className="mb-1 block text-sm font-medium text-gray-700">
            Best Time <span className="text-red-600">*</span>
          </label>
          <input id="bestTime" name="bestTime" type="time" required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
          Concern / Message <span className="text-red-600">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          placeholder="Describe the issue or service required"
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-red-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <LoadingLabel label="Sending..." /> : "Schedule Service"}
      </button>

      <p className="text-center text-xs leading-relaxed text-gray-500">
        By submitting this form you will be scheduling a service appointment at no obligation and will be
        contacted within 48 hours by a service advisor.
      </p>
    </form>
  );
}
