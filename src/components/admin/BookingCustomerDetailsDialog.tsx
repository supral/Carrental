"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BookingRow } from "@/components/admin/BookingsTable";

type Props = {
  booking: BookingRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim() || value === "—") return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground break-words">{value}</dd>
    </div>
  );
}

function LicenceImage({ url, label }: { url?: string | null; label: string }) {
  if (!url) return null;
  const isPdf = url.toLowerCase().endsWith(".pdf");
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline"
        >
          Open licence PDF
        </a>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="max-h-56 w-full rounded-lg border border-border object-contain bg-muted/30"
          />
        </a>
      )}
    </div>
  );
}

export default function BookingCustomerDetailsDialog({
  booking,
  open,
  onOpenChange,
}: Props) {
  if (!booking) return null;

  const dob = booking.customerDob
    ? format(new Date(booking.customerDob), "dd MMM yyyy")
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customer details</DialogTitle>
          <DialogDescription>
            {booking.vehicleName} · Booking {booking.id.slice(0, 12)}…
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Contact</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Full name" value={booking.customerName} />
              <Detail label="Email" value={booking.customerEmail} />
              <Detail label="Phone" value={booking.customerPhone} />
              <Detail label="Date of birth" value={dob} />
              <Detail label="Address" value={booking.customerAddress} />
              <Detail label="Country" value={booking.customerCountry} />
            </dl>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">Licence (booking)</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Detail label="Licence number" value={booking.drivingLicenceNumber} />
              <div className="sm:col-span-2">
                <LicenceImage url={booking.licencePhotoUrl} label="Licence image" />
              </div>
              {!booking.drivingLicenceNumber && !booking.licencePhotoUrl && (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  No licence details saved on this booking yet.
                </p>
              )}
            </dl>
          </section>

          {booking.drivers.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold">Drivers</h3>
              <div className="space-y-4">
                {booking.drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="rounded-lg border border-border bg-muted/20 p-3 space-y-3"
                  >
                    <p className="text-sm font-medium">
                      {driver.firstName} {driver.lastName}
                      {driver.isPrimary ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (Primary)
                        </span>
                      ) : null}
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Detail label="Email" value={driver.email} />
                      <Detail label="Phone" value={driver.phone} />
                      <Detail label="Address" value={driver.address} />
                      <Detail
                        label="Date of birth"
                        value={
                          driver.dob
                            ? format(new Date(driver.dob), "dd MMM yyyy")
                            : null
                        }
                      />
                      <Detail label="Licence number" value={driver.licenceNumber} />
                      <Detail
                        label="Licence expiry"
                        value={
                          driver.licenceExpiry
                            ? format(new Date(driver.licenceExpiry), "dd MMM yyyy")
                            : null
                        }
                      />
                      <Detail label="Emergency contact" value={driver.emergencyContact} />
                      <Detail label="Emergency phone" value={driver.emergencyPhone} />
                    </dl>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LicenceImage url={driver.licenceFrontUrl} label="Licence front" />
                      <LicenceImage url={driver.licenceBackUrl} label="Licence back" />
                    </div>
                    {driver.signatureUrl && (
                      <LicenceImage url={driver.signatureUrl} label="Signature" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {booking.notes?.trim() && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {booking.notes}
              </p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
