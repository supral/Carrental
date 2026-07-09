"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { formatSaleBookingStatus } from "@/lib/sales/sale-booking-status";
import { formatRentalBookingStatus } from "@/lib/rentals/rental-booking-status";

interface SaleBookingRecord {
  id: string;
  type: "sale";
  status: string;
  paymentStatus: string;
  customerName: string;
  vehicleName: string;
  vehiclePrice: number;
  agreedPriceCents: number | null;
  meetingScheduledAt: string | null;
  createdAt: string;
  statusUrl: string;
}

interface RentalBookingRecord {
  id: string;
  type: "rental";
  status: string;
  paymentStatus: string;
  customerName: string;
  vehicleName: string;
  pickupAt: string;
  dropoffAt: string;
  rentalDays: number;
  totalAmountCents: number;
  createdAt: string;
  statusUrl: string;
}

interface SearchResult {
  email: string;
  saleBookings: SaleBookingRecord[];
  rentalBookings: RentalBookingRecord[];
  totalCount: number;
}

function StatusBadge({ status, type }: { status: string; type: "sale" | "rental" }) {
  const label = type === "sale" ? formatSaleBookingStatus(status as never) : formatRentalBookingStatus(status as never);
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    MEETING_SCHEDULED: "bg-blue-100 text-blue-800",
    DEAL_FINALIZED: "bg-purple-100 text-purple-800",
    PAID: "bg-green-100 text-green-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    CONFIRMED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {label}
    </span>
  );
}

export default function MyBookingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  const [email, setEmail] = useState(emailParam || "");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = async (searchEmail: string) => {
    const trimmed = searchEmail.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch("/api/bookings/by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setResult(json.data);
      router.replace(`/my-bookings?email=${encodeURIComponent(trimmed)}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
      runSearch(emailParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSearch(email);
  };

  const allRecords = [
    ...(result?.saleBookings.map((b) => ({ ...b, sortDate: b.createdAt })) ?? []),
    ...(result?.rentalBookings.map((b) => ({ ...b, sortDate: b.createdAt })) ?? []),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  return (
    <div className="bg-gray-50 py-10 lg:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
          <h1 className="text-2xl font-bold text-gray-900">My bookings & purchases</h1>
          <p className="mt-2 text-gray-600">
            Enter the email you used for car rental or purchase requests to view your status and history.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
              {error}
            </div>
          )}
        </div>

        {searched && !loading && result && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-600">
              {result.totalCount === 0
                ? `No records found for ${result.email}.`
                : `${result.totalCount} record${result.totalCount === 1 ? "" : "s"} for ${result.email}`}
            </p>

            {allRecords.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
                <p>No rental or purchase requests found with this email.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Link href="/car-rental" className="font-semibold text-primary hover:text-primary/80">
                    Browse rentals
                  </Link>
                </div>
              </div>
            ) : (
              allRecords.map((record) => (
                <div key={`${record.type}-${record.id}`} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {record.type === "sale" ? "Car purchase" : "Car rental"}
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900">{record.vehicleName}</p>
                      <p className="mt-1 text-xs text-gray-500 font-mono">Ref: {record.id}</p>
                    </div>
                    <StatusBadge status={record.status} type={record.type} />
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-gray-900">Submitted:</span>{" "}
                      {format(new Date(record.createdAt), "dd MMM yyyy, h:mm a")}
                    </p>
                    <p>
                      <span className="font-medium text-gray-900">Payment:</span> {record.paymentStatus}
                    </p>

                    {record.type === "sale" && (
                      <>
                        <p>
                          <span className="font-medium text-gray-900">Listed price:</span>{" "}
                          {formatPrice(record.vehiclePrice)}
                        </p>
                        {record.agreedPriceCents != null && (
                          <p>
                            <span className="font-medium text-gray-900">Agreed price:</span>{" "}
                            {formatPrice(record.agreedPriceCents / 100)}
                          </p>
                        )}
                        {record.meetingScheduledAt && (
                          <p className="sm:col-span-2">
                            <span className="font-medium text-gray-900">Viewing:</span>{" "}
                            {format(new Date(record.meetingScheduledAt), "dd MMM yyyy, h:mm a")}
                          </p>
                        )}
                      </>
                    )}

                    {record.type === "rental" && (
                      <>
                        <p>
                          <span className="font-medium text-gray-900">Pickup:</span>{" "}
                          {format(new Date(record.pickupAt), "dd MMM yyyy, h:mm a")}
                        </p>
                        <p>
                          <span className="font-medium text-gray-900">Drop-off:</span>{" "}
                          {format(new Date(record.dropoffAt), "dd MMM yyyy, h:mm a")}
                        </p>
                        <p>
                          <span className="font-medium text-gray-900">Duration:</span> {record.rentalDays} day
                          {record.rentalDays === 1 ? "" : "s"}
                        </p>
                        <p>
                          <span className="font-medium text-gray-900">Total:</span>{" "}
                          {formatPrice(record.totalAmountCents / 100)}
                        </p>
                      </>
                    )}
                  </div>

                  <Link
                    href={record.statusUrl}
                    className="mt-4 inline-flex text-sm font-semibold text-primary hover:text-primary/80"
                  >
                    View full status →
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
