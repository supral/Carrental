"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Mail,
  MapPin,
  Phone,
  User,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice, cn } from "@/lib/utils";
import {
  acceptSaleBookingAction,
  cancelSaleBookingAction,
  completeSaleAction,
  finalizeSaleDealAction,
  markSalePaidAction,
  scheduleSaleMeetingAction,
} from "@/lib/admin/sale-booking-actions";
import {
  buildDefaultMeetingNotes,
  formatPreferredContactTime,
  isViewingTimePassed,
  suggestMeetingDateTimeFromPreferredTime,
} from "@/lib/sales/sale-booking-status";

export type SaleBookingRow = {
  id: string;
  vehicleName: string;
  vehicleNumber: string | null;
  dealerName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerMessage: string | null;
  preferredContactTime: string | null;
  status: string;
  paymentStatus: string;
  listPrice: number;
  currentPrice: number;
  isOnOffer: boolean;
  offerType: string | null;
  savingsAmount: number;
  savingsPercent: number;
  agreedPriceCents: number | null;
  meetingScheduledAt: Date | null;
  meetingLocation: string | null;
  meetingNotes: string | null;
  createdAt: Date;
};

const WORKFLOW_STEPS = [
  { key: "PENDING", label: "Request" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "MEETING_SCHEDULED", label: "Viewing" },
  { key: "DEAL_FINALIZED", label: "Finalized" },
  { key: "PAID", label: "Paid" },
  { key: "COMPLETED", label: "Delivered" },
] as const;

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-200",
  ACCEPTED: "bg-sky-100 text-sky-900 border-sky-200",
  MEETING_SCHEDULED: "bg-blue-100 text-blue-900 border-blue-200",
  DEAL_FINALIZED: "bg-violet-100 text-violet-900 border-violet-200",
  PAID: "bg-emerald-100 text-emerald-900 border-emerald-200",
  COMPLETED: "bg-green-100 text-green-900 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
};

function CompletedWorkflowStep({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
      <p className="font-semibold text-emerald-900">{title}</p>
      <div className="mt-2 space-y-1 text-sm text-emerald-800">{children}</div>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function getWorkflowIndex(status: string) {
  if (status === "CANCELLED") return -1;
  const index = WORKFLOW_STEPS.findIndex((step) => step.key === status);
  return index >= 0 ? index : 0;
}

function BookingWorkflow({ status }: { status: string }) {
  const activeIndex = getWorkflowIndex(status);
  const cancelled = status === "CANCELLED";
  const finished = status === "COMPLETED";

  if (cancelled) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        This request was cancelled and is no longer active.
      </div>
    );
  }

  return (
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {WORKFLOW_STEPS.map((step, index) => {
        const complete = finished ? index <= activeIndex : index < activeIndex;
        const current = !finished && index === activeIndex;

        return (
          <li
            key={step.key}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-center transition-colors",
              complete && "border-emerald-200 bg-emerald-50",
              current && "border-primary/30 bg-primary/5 shadow-sm",
              !complete && !current && "border-border bg-muted/30"
            )}
          >
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wide",
                complete && "text-emerald-700",
                current && "text-primary",
                !complete && !current && "text-muted-foreground"
              )}
            >
              {step.label}
            </p>
            <div className="mt-1 flex justify-center">
              {complete ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <span
                  className={cn(
                    "mt-0.5 block h-2 w-2 rounded-full",
                    current ? "bg-primary" : "bg-gray-300"
                  )}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PriceSummary({ booking }: { booking: SaleBookingRow }) {
  const agreedPrice =
    booking.agreedPriceCents != null ? booking.agreedPriceCents / 100 : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          List price
        </p>
        <p
          className={cn(
            "mt-1 text-xl font-bold text-foreground",
            booking.isOnOffer && "text-base font-medium text-muted-foreground line-through"
          )}
        >
          {formatPrice(booking.listPrice)}
        </p>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          {booking.isOnOffer ? "Offer price" : "Current price"}
        </p>
        <p className="mt-1 text-2xl font-bold text-red-600">
          {formatPrice(booking.currentPrice)}
        </p>
        {booking.isOnOffer && booking.offerType && (
          <p className="mt-1 text-xs font-medium text-red-700/80">
            {booking.offerType} · Save {formatPrice(booking.savingsAmount)} ({booking.savingsPercent}
            %)
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Agreed price
        </p>
        <p className="mt-1 text-xl font-bold text-foreground">
          {agreedPrice != null ? formatPrice(agreedPrice) : "—"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Requested
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {format(new Date(booking.createdAt), "dd MMM yyyy")}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(booking.createdAt), "h:mm a")}
        </p>
      </div>
    </div>
  );
}

export default function SaleBookingsTable({
  bookings,
  highlightBookingId,
}: {
  bookings: SaleBookingRow[];
  highlightBookingId?: string;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(highlightBookingId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (highlightBookingId) {
      setExpandedId(highlightBookingId);
    }
  }, [highlightBookingId]);

  const runAction = (action: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  };

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <Car className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 font-medium text-foreground">No sale bookings yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Purchase requests from the website will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {bookings.map((booking) => {
        const expanded = expandedId === booking.id;
        const defaultAgreedPrice =
          booking.agreedPriceCents != null
            ? booking.agreedPriceCents / 100
            : booking.currentPrice;
        const canAccept = booking.status === "PENDING";
        const canSchedule =
          booking.status === "ACCEPTED" || booking.status === "MEETING_SCHEDULED";
        const canFinalize = isViewingTimePassed(
          booking.status,
          booking.meetingScheduledAt
        );
        const viewingComplete = ["DEAL_FINALIZED", "PAID", "COMPLETED"].includes(booking.status);
        const dealFinalized = ["DEAL_FINALIZED", "PAID", "COMPLETED"].includes(booking.status);
        const canMarkPaid =
          booking.status === "DEAL_FINALIZED" && booking.paymentStatus !== "PAID";
        const canComplete = booking.status === "PAID";
        const isDelivered = booking.status === "COMPLETED";
        const canCancel =
          !isDelivered && booking.status !== "CANCELLED";
        const viewingTimePassed = canFinalize;
        const buyerPreferredTime = formatPreferredContactTime(booking.preferredContactTime);
        const suggestedMeetingAt = booking.meetingScheduledAt
          ? format(new Date(booking.meetingScheduledAt), "yyyy-MM-dd'T'HH:mm")
          : suggestMeetingDateTimeFromPreferredTime(
              booking.preferredContactTime,
              new Date(booking.createdAt)
            );
        const defaultMeetingNotes = buildDefaultMeetingNotes(
          booking.preferredContactTime,
          booking.meetingNotes
        );

        return (
          <article
            key={booking.id}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="border-b border-border bg-muted/20 px-5 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">{booking.vehicleName}</h2>
                    {booking.isOnOffer && booking.offerType && (
                      <Badge className="border-red-200 bg-red-100 text-red-800 hover:bg-red-100">
                        {booking.offerType}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.dealerName}
                    {booking.vehicleNumber ? ` · VIN ${booking.vehicleNumber}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {booking.customerName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {booking.customerEmail}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {booking.customerPhone}
                    </span>
                  </div>
                  {booking.meetingScheduledAt && (
                    <p className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700">
                      <Calendar className="h-3.5 w-3.5" />
                      Viewing {format(new Date(booking.meetingScheduledAt), "dd MMM yyyy, h:mm a")}
                      {booking.meetingLocation ? ` · ${booking.meetingLocation}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", statusColors[booking.status])}
                  >
                    {formatStatus(booking.status)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      booking.paymentStatus === "PAID"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    )}
                  >
                    {booking.paymentStatus}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedId(expanded ? null : booking.id)}
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Close
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Manage
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {viewingTimePassed && (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
                <p className="inline-flex items-start gap-2 text-sm font-medium text-amber-950">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Viewing time has ended. Finalize the deal or cancel this request.
                </p>
              </div>
            )}

            <div className="px-5 py-4 sm:px-6">
              <PriceSummary booking={booking} />
            </div>

            {expanded && (
              <div className="space-y-5 border-t border-border px-5 py-5 sm:px-6">
                <BookingWorkflow status={booking.status} />

                {(booking.customerMessage || booking.preferredContactTime) && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm font-semibold text-foreground">Buyer notes</p>
                    {booking.preferredContactTime && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Preferred contact time: {booking.preferredContactTime}
                      </p>
                    )}
                    {booking.customerMessage && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {booking.customerMessage}
                      </p>
                    )}
                  </div>
                )}

                {canAccept && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
                    <p className="font-semibold text-sky-950">Accept this buyer</p>
                    <p className="mt-1 text-sm text-sky-900/80">
                      Accepting will automatically cancel all other pending requests for this
                      vehicle. The buyer will be notified by email.
                    </p>
                    <Button
                      className="mt-4"
                      disabled={isPending}
                      onClick={() => runAction(() => acceptSaleBookingAction(booking.id))}
                    >
                      Accept request
                    </Button>
                  </div>
                )}

                {isDelivered && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                    <p className="font-semibold text-emerald-900">Sale complete</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      This vehicle has been delivered to the buyer. All workflow steps are finished.
                    </p>
                  </div>
                )}

                <div className="grid gap-5 xl:grid-cols-2">
                  {viewingComplete ? (
                    <CompletedWorkflowStep title="Viewing completed">
                      <p>
                        {booking.meetingScheduledAt
                          ? format(new Date(booking.meetingScheduledAt), "dd MMM yyyy, h:mm a")
                          : "Viewing date recorded"}
                      </p>
                      {booking.meetingLocation && <p>{booking.meetingLocation}</p>}
                      {booking.meetingNotes && <p>{booking.meetingNotes}</p>}
                    </CompletedWorkflowStep>
                  ) : (
                    <form
                      className="space-y-4 rounded-xl border border-border p-4 sm:p-5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        runAction(() =>
                          scheduleSaleMeetingAction(booking.id, {
                            meetingScheduledAt: String(formData.get("meetingScheduledAt")),
                            meetingLocation: String(formData.get("meetingLocation")),
                            meetingNotes: String(formData.get("meetingNotes") || ""),
                          })
                        );
                      }}
                    >
                      <div>
                        <p className="font-semibold text-foreground">Schedule viewing</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Set a date, location, and optional notes. The buyer receives an email
                          confirmation.
                        </p>
                      </div>

                      {!canSchedule && booking.status === "PENDING" && (
                        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                          Accept the request before scheduling a viewing.
                        </p>
                      )}

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`meeting-${booking.id}`}>Date & time</Label>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Buyer preferred:{" "}
                            <span className="font-medium text-foreground">{buyerPreferredTime}</span>
                            {!booking.meetingScheduledAt ? " · Suggested time pre-filled below" : ""}
                          </p>
                          <Input
                            id={`meeting-${booking.id}`}
                            name="meetingScheduledAt"
                            type="datetime-local"
                            className="mt-1.5"
                            required
                            disabled={!canSchedule || isPending || isDelivered}
                            defaultValue={suggestedMeetingAt}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`location-${booking.id}`}>Location</Label>
                          <div className="relative mt-1.5">
                            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id={`location-${booking.id}`}
                              name="meetingLocation"
                              className="pl-9"
                              required
                              disabled={!canSchedule || isPending || isDelivered}
                              defaultValue={booking.meetingLocation || "Everest Car Rental, Darwin"}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`notes-${booking.id}`}>Notes</Label>
                          <Input
                            id={`notes-${booking.id}`}
                            name="meetingNotes"
                            className="mt-1.5"
                            placeholder="Bring licence, proof of funds, etc."
                            disabled={!canSchedule || isPending || isDelivered}
                            defaultValue={defaultMeetingNotes}
                          />
                        </div>
                      </div>

                      <Button type="submit" disabled={!canSchedule || isPending || isDelivered}>
                        <Calendar className="h-4 w-4" />
                        {booking.status === "MEETING_SCHEDULED"
                          ? "Update viewing"
                          : "Schedule & email buyer"}
                      </Button>
                    </form>
                  )}

                  <div className="space-y-4">
                    {dealFinalized ? (
                      <CompletedWorkflowStep title="Deal finalized">
                        <p>
                          Agreed price:{" "}
                          {booking.agreedPriceCents != null
                            ? formatPrice(booking.agreedPriceCents / 100)
                            : "—"}
                        </p>
                        {booking.isOnOffer && (
                          <p>
                            Offer price: {formatPrice(booking.currentPrice)} · List price:{" "}
                            {formatPrice(booking.listPrice)}
                          </p>
                        )}
                      </CompletedWorkflowStep>
                    ) : (
                      <form
                        className="space-y-4 rounded-xl border border-border p-4 sm:p-5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          runAction(() =>
                            finalizeSaleDealAction(booking.id, Number(formData.get("agreedPriceAud")))
                          );
                        }}
                      >
                        <div>
                          <p className="font-semibold text-foreground">Finalize deal</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Confirm the final sale price after the viewing has taken place.
                          </p>
                        </div>

                        {!canFinalize && booking.status === "PENDING" && (
                          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                            Accept the request before finalizing the deal.
                          </p>
                        )}
                        {!canFinalize && booking.status === "ACCEPTED" && (
                          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                            Schedule a viewing before finalizing the deal.
                          </p>
                        )}
                        {!canFinalize &&
                          booking.status === "MEETING_SCHEDULED" &&
                          booking.meetingScheduledAt && (
                            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                              Finalize the deal after the viewing on{" "}
                              {format(new Date(booking.meetingScheduledAt), "dd MMM yyyy, h:mm a")}{" "}
                              has ended.
                            </p>
                          )}
                        {!canFinalize &&
                          booking.status === "MEETING_SCHEDULED" &&
                          !booking.meetingScheduledAt && (
                            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                              Save a viewing date and time before finalizing the deal.
                            </p>
                          )}

                        <div>
                          <Label htmlFor={`price-${booking.id}`}>Agreed price (AUD)</Label>
                          <div className="relative mt-1.5">
                            <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id={`price-${booking.id}`}
                              name="agreedPriceAud"
                              type="number"
                              min={1}
                              step={1}
                              className="pl-9"
                              required
                              disabled={!canFinalize || isPending || isDelivered}
                              defaultValue={defaultAgreedPrice}
                            />
                          </div>
                          {booking.isOnOffer && (
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              Offer price: {formatPrice(booking.currentPrice)} · List price:{" "}
                              {formatPrice(booking.listPrice)}
                            </p>
                          )}
                        </div>

                        <Button
                          type="submit"
                          variant="secondary"
                          disabled={!canFinalize || isPending || isDelivered}
                        >
                          Mark deal finalized
                        </Button>
                      </form>
                    )}

                    <div className="rounded-xl border border-border p-4 sm:p-5">
                      <p className="font-semibold text-foreground">Payment & delivery</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Mark payment received after the deal is finalized, then complete delivery.
                      </p>
                      {!canMarkPaid && booking.status === "PAID" && (
                        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          Payment received — confirm vehicle handover below.
                        </p>
                      )}
                      {!canMarkPaid && isDelivered && (
                        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          Payment received and vehicle delivered.
                        </p>
                      )}
                      {!canMarkPaid &&
                        !canComplete &&
                        !isDelivered &&
                        !["DEAL_FINALIZED", "PAID"].includes(booking.status) && (
                          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                            Finalize the deal before recording payment.
                          </p>
                        )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          disabled={!canMarkPaid || isPending || isDelivered}
                          onClick={() => runAction(() => markSalePaidAction(booking.id))}
                        >
                          Mark payment received
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={!canComplete || isPending || isDelivered}
                          onClick={() => runAction(() => completeSaleAction(booking.id))}
                        >
                          <Car className="h-4 w-4" />
                          {isDelivered ? "Car provided" : "Car provided"}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!canCancel || isPending}
                          onClick={() => runAction(() => cancelSaleBookingAction(booking.id))}
                        >
                          Cancel request
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
