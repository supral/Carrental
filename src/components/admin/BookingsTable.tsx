"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import type { PricedRentalOptionLine } from "@/lib/rentals/option-catalog";
import {
  getWorkflowDisplayStatus,
  WORKFLOW_STATUS_BADGE_CLASS,
} from "@/lib/rentals/rental-workflow";

export type BookingRow = {
  id: string;
  vehicleName: string;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  customerZip?: string;
  customerCountry?: string;
  pickupAt: Date;
  dropoffAt: Date;
  status: string;
  paymentStatus: string;
  baseAmountCents: number;
  extrasAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
  selectedOptions: PricedRentalOptionLine[];
  createdAt: Date;
};

export default function BookingsTable({ bookings }: { bookings: BookingRow[] }) {
  const columns: ColumnDef<BookingRow>[] = [
    {
      accessorKey: "vehicleName",
      header: "Vehicle",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/bookings/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.vehicleName}
          </Link>
          <p className="text-xs text-muted-foreground">{row.original.customerName}</p>
          {(row.original.customerAddress || row.original.customerCountry) && (
            <p className="text-xs text-muted-foreground">
              {[row.original.customerAddress, row.original.customerZip, row.original.customerCountry]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
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
        <Badge
          className={
            row.original.paymentStatus === "PAID"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }
        >
          {row.original.paymentStatus}
        </Badge>
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
  ];

  return <DataTable data={bookings} columns={columns} />;
}
