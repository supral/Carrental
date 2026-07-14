"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/rentals/SignaturePad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPublicRentalAgreementAction } from "@/lib/admin/rental-agreement-actions";

type DriverForm = {
  isPrimary: boolean;
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  licenceNumber: string;
  licenceExpiry: string;
  licenceFrontUrl: string;
  licenceBackUrl: string;
  signatureDataUrl: string;
};

function emptyDriver(isPrimary: boolean): DriverForm {
  return {
    isPrimary,
    firstName: "",
    lastName: "",
    dob: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    licenceNumber: "",
    licenceExpiry: "",
    licenceFrontUrl: "",
    licenceBackUrl: "",
    signatureDataUrl: "",
  };
}

async function uploadLicence(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/uploads/licence", { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload failed");
  return json.url as string;
}

type Props = {
  bookingId: string;
  token: string;
  vehicleLabel: string;
  alreadyCompleted?: boolean;
  defaults?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
};

const TERMS = [
  { key: "rentalTerms", label: "I agree to Rental Terms" },
  { key: "insuranceExcess", label: "Insurance Excess" },
  { key: "fuelPolicy", label: "Fuel Policy" },
  { key: "extraKilometres", label: "Extra Kilometres" },
  { key: "lateReturnCharges", label: "Late Return Charges" },
  { key: "damagePolicy", label: "Damage Policy" },
] as const;

export default function CustomerRentalAgreementForm({
  bookingId,
  token,
  vehicleLabel,
  alreadyCompleted,
  defaults,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [driverCount, setDriverCount] = useState(1);
  const [drivers, setDrivers] = useState<DriverForm[]>([
    {
      ...emptyDriver(true),
      firstName: defaults?.firstName ?? "",
      lastName: defaults?.lastName ?? "",
      email: defaults?.email ?? "",
      phone: defaults?.phone ?? "",
    },
  ]);
  const [terms, setTerms] = useState<Record<(typeof TERMS)[number]["key"], boolean>>({
    rentalTerms: false,
    insuranceExcess: false,
    fuelPolicy: false,
    extraKilometres: false,
    lateReturnCharges: false,
    damagePolicy: false,
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(Boolean(alreadyCompleted));

  function setDriverCountSafe(count: number) {
    setDriverCount(count);
    setDrivers((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(emptyDriver(false));
      return next.slice(0, count).map((driver, index) => ({
        ...driver,
        isPrimary: index === 0,
      }));
    });
  }

  function updateDriver(index: number, patch: Partial<DriverForm>) {
    setDrivers((prev) => prev.map((driver, i) => (i === index ? { ...driver, ...patch } : driver)));
  }

  function allTermsAccepted() {
    return TERMS.every((term) => terms[term.key]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!allTermsAccepted()) {
      setError("Please accept all terms before submitting.");
      return;
    }
    startTransition(async () => {
      try {
        await submitPublicRentalAgreementAction(bookingId, token, {
          driverCount,
          drivers,
          terms: {
            rentalTerms: true,
            insuranceExcess: true,
            fuelPolicy: true,
            extraKilometres: true,
            lateReturnCharges: true,
            damagePolicy: true,
          },
        });
        setDone(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <h2 className="text-xl font-semibold">Agreement submitted</h2>
        <p className="mt-2 text-sm">
          Thank you. Our team will assign your vehicle and send the rental agreement PDF shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Digital Rental Agreement</h1>
        <p className="mt-1 text-sm text-slate-600">Vehicle: {vehicleLabel}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <Label>Number of Drivers</Label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((count) => (
            <Button
              key={count}
              type="button"
              variant={driverCount === count ? "default" : "outline"}
              onClick={() => setDriverCountSafe(count)}
            >
              {count}
            </Button>
          ))}
        </div>
      </div>

      {drivers.map((driver, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">
            {index === 0 ? "Primary Driver" : `Additional Driver ${index}`}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>First Name</Label>
              <Input
                value={driver.firstName}
                onChange={(e) => updateDriver(index, { firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input
                value={driver.lastName}
                onChange={(e) => updateDriver(index, { lastName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={driver.dob}
                onChange={(e) => updateDriver(index, { dob: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={driver.phone}
                onChange={(e) => updateDriver(index, { phone: e.target.value })}
                required
              />
            </div>
            {index === 0 && (
              <>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={driver.email}
                    onChange={(e) => updateDriver(index, { email: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={driver.address}
                    onChange={(e) => updateDriver(index, { address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Emergency Contact</Label>
                  <Input
                    value={driver.emergencyContact}
                    onChange={(e) => updateDriver(index, { emergencyContact: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Emergency Phone</Label>
                  <Input
                    value={driver.emergencyPhone}
                    onChange={(e) => updateDriver(index, { emergencyPhone: e.target.value })}
                  />
                </div>
              </>
            )}
            <div>
              <Label>Licence Number</Label>
              <Input
                value={driver.licenceNumber}
                onChange={(e) => updateDriver(index, { licenceNumber: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Licence Expiry</Label>
              <Input
                type="date"
                value={driver.licenceExpiry}
                onChange={(e) => updateDriver(index, { licenceExpiry: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Licence Front</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadLicence(file);
                  updateDriver(index, { licenceFrontUrl: url });
                }}
                required={!driver.licenceFrontUrl}
              />
              {driver.licenceFrontUrl && (
                <p className="mt-1 text-xs text-emerald-700">Uploaded</p>
              )}
            </div>
            <div>
              <Label>Licence Back</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadLicence(file);
                  updateDriver(index, { licenceBackUrl: url });
                }}
                required={!driver.licenceBackUrl}
              />
              {driver.licenceBackUrl && <p className="mt-1 text-xs text-emerald-700">Uploaded</p>}
            </div>
          </div>
          <SignaturePad
            label="Digital Signature"
            onChange={(dataUrl) => updateDriver(index, { signatureDataUrl: dataUrl ?? "" })}
          />
        </div>
      ))}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Rental Terms & Conditions</h2>
        <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
          <p>
            The hirer agrees to the full rental terms including authorised drivers only, insurance
            excess liability, returning fuel at pickup level, excess kilometre charges, late return
            fees, and responsibility for damage, loss, and theft according to the selected cover.
          </p>
          <p>
            Accidents must be reported immediately. The vehicle must be returned on time with all
            accessories and keys. False licence information voids cover.
          </p>
        </div>
        <div className="space-y-2">
          {TERMS.map((term) => (
            <label key={term.key} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={terms[term.key]}
                onChange={(e) => setTerms((prev) => ({ ...prev, [term.key]: e.target.checked }))}
              />
              <span>{term.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={pending || !allTermsAccepted()} className="w-full sm:w-auto">
        {pending ? "Submitting..." : "Submit Rental Agreement"}
      </Button>
    </form>
  );
}
