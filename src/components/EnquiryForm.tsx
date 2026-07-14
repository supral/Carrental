"use client";

import { useState, FormEvent } from "react";
import { FormType } from "@/types";
import { formConfigs } from "@/data/form-configs";
import { LoadingLabel, LoadingOverlay } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

interface EnquiryFormProps {
  type: FormType;
  vehicleInfo?: string;
  className?: string;
  compact?: boolean;
}

export default function EnquiryForm({
  type,
  vehicleInfo,
  className = "",
  compact = false,
}: EnquiryFormProps) {
  const config = formConfigs[type];
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
      data[key] = value.toString();
    });

    if (vehicleInfo) {
      data.vehicleInfo = vehicleInfo;
    }

    try {
      const { submitForm } = await import("@/lib/api");
      await submitForm(type, data);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`rounded-xl bg-green-50 border border-green-200 p-8 text-center ${className}`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-4">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h3>
        <p className="text-gray-600">
          Your enquiry has been received. Our team will review it and contact you by email shortly.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <LoadingOverlay show={loading} label="Sending your message..." />
      {!compact && (
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{config.title}</h3>
          <p className="mt-2 text-gray-600">{config.subtitle}</p>
        </div>
      )}

      {vehicleInfo && (
        <div className="mb-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          <span className="font-medium">Vehicle:</span> {vehicleInfo}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-primary ml-1">*</span>}
            </label>

            {field.type === "textarea" ? (
              <textarea
                id={field.name}
                name={field.name}
                required={field.required}
                placeholder={field.placeholder}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
            ) : field.type === "select" ? (
              <select
                id={field.name}
                name={field.name}
                required={field.required}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white"
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            )}
          </div>
        ))}

        {error && (
          <div className="rounded-lg bg-accent border border-primary/20 px-4 py-3 text-sm text-accent-foreground">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <LoadingLabel label="Sending..." /> : "Submit Enquiry"}
        </button>
      </form>
    </div>
  );
}
