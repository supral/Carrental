"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Search } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import BookingCustomerDetailsDialog from "@/components/admin/BookingCustomerDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import type { PricedRentalOptionLine } from "@/lib/rentals/option-catalog";
import {
  getWorkflowDisplayStatus,
  WORKFLOW_STATUS_BADGE_CLASS,
} from "@/lib/rentals/rental-workflow";

export type BookingDriverRow = {
  id: string;
  isPrimary: boolean;
  firstName: string;
  lastName: string;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  licenceNumber?: string | null;
  licenceExpiry?: string | null;
  licenceFrontUrl?: string | null;
  licenceBackUrl?: string | null;
  signatureUrl?: string | null;
};

export type BookingRow = {
  id: string;
  vehicleName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCountry?: string;
  customerDob?: string | null;
  drivingLicenceNumber?: string | null;
  licencePhotoUrl?: string | null;
  notes?: string | null;
  drivers: BookingDriverRow[];
  pickupAt: Date;
  dropoffAt: Date;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  baseAmountCents: number;
  extrasAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  selectedOptions: PricedRentalOptionLine[];
  createdAt: Date;
};

function matchesCustomerSearch(booking: BookingRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    booking.customerName,
    booking.customerEmail,
    booking.customerPhone,
    booking.customerAddress,
    booking.customerCountry,
    booking.drivingLicenceNumber,
    booking.vehicleName,
    booking.id,
    ...booking.drivers.flatMap((driver) => [
      driver.firstName,
      driver.lastName,
      driver.email,
      driver.phone,
      driver.licenceNumber,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export default function BookingsTable({ bookings }: { bookings: BookingRow[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => matchesCustomerSearch(booking, searchQuery)),
    [bookings, searchQuery]
  );

  const columns: ColumnDef<BookingRow>[] = [
    {
      accessorKey: "vehicleName",
      header: "Vehicle",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.vehicleName}</p>
          <button
            type="button"
            onClick={() => setSelectedBooking(row.original)}
            className="mt-0.5 text-left group"
            title="View customer details"
          >
            <p className="text-xs font-medium text-primary group-hover:underline">
              {row.original.customerName}
            </p>
            {row.original.customerEmail !== "—" && (
              <p className="text-xs text-muted-foreground group-hover:text-primary/80">
                {row.original.customerEmail}
              </p>
            )}
            {row.original.customerPhone && (
              <p className="text-xs text-muted-foreground group-hover:text-primary/80">
                {row.original.customerPhone}
              </p>
            )}
            {(row.original.customerAddress || row.original.customerCountry) && (
              <p className="text-xs text-muted-foreground group-hover:text-primary/80">
                {[row.original.customerAddress, row.original.customerCountry]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </button>
        </div>
      ),
    },
    {
      id: "period",
      header: "Rental Period",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{format(new Date(row.original.pickupAt), "dd MMM yyyy, h:mm a")}</p>
          <p className="text-muted-foreground">
            to {format(new Date(row.original.dropoffAt), "dd MMM yyyy, h:mm a")}
          </p>
        </div>
      ),
    },
    {
      id: "options",
      header: "Insurance & Extras",
      cell: ({ row }) => {
        const insurance = row.original.selectedOptions.filter((line) => line.category === "insurance");
        const extras = row.original.selectedOptions.filter((line) => line.category === "extra");

        return (
          <div className="max-w-xs space-y-2 text-xs">
            {insurance.length > 0 && (
              <div>
                <p className="font-medium text-gray-700">Insurance</p>
                {insurance.map((line) => (
                  <p key={line.type} className="text-green-700">
                    ✔ {line.label}
                  </p>
                ))}
              </div>
            )}
            {extras.length > 0 && (
              <div>
                <p className="font-medium text-gray-700">Extras</p>
                {extras.map((line) => (
                  <p key={line.type}>
                    {line.label}
                    {line.quantity > 1 ? ` ×${line.quantity}` : ""}
                  </p>
                ))}
              </div>
            )}
            {insurance.length === 0 && extras.length === 0 && (
              <span className="text-muted-foreground">No options selected</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "totalAmountCents",
      header: "Total",
      cell: ({ row }) => formatPrice(row.original.totalAmountCents / 100),
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge
            className={
              row.original.paymentStatus === "PAID"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }
          >
            {row.original.paymentStatus}
          </Badge>
          {row.original.paymentMethod && (
            <p className="text-xs text-muted-foreground">{row.original.paymentMethod}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const displayStatus = getWorkflowDisplayStatus(row.original.status);
        return (
          <Badge className={WORKFLOW_STATUS_BADGE_CLASS[displayStatus]}>{displayStatus}</Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Edit",
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/bookings/${row.original.id}`}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-sm lg:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search customer name, email, phone..."
          className="pl-9"
          aria-label="Search bookings by customer"
        />
      </div>
      {searchQuery.trim() && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredBookings.length} of {bookings.length} bookings matching “
          {searchQuery.trim()}”
        </p>
      )}
      <DataTable data={filteredBookings} columns={columns} />
      <BookingCustomerDetailsDialog
        booking={selectedBooking}
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => {
          if (!open) setSelectedBooking(null);
        }}
      />
    </div>
  );
}
