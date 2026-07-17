"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";

export type FleetTypeSummaryRow = {
  vehicleId: string;
  vehicleName: string;
  fleetSize: number;
  available: number;
  rented: number;
  reserved: number;
  maintenance: number;
};

export default function FleetVehiclesTable({ rows }: { rows: FleetTypeSummaryRow[] }) {
  const columns: ColumnDef<FleetTypeSummaryRow>[] = [
    {
      accessorKey: "vehicleName",
      header: "Vehicle Type",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold">{row.original.vehicleName}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.fleetSize} physical unit{row.original.fleetSize === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "fleetSize",
      header: "Fleet Size",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium">{row.original.fleetSize}</span>
      ),
    },
    {
      accessorKey: "available",
      header: "Available",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-green-700">{row.original.available}</span>
      ),
    },
    {
      accessorKey: "rented",
      header: "Rented",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-blue-700">{row.original.rented}</span>
      ),
    },
    {
      accessorKey: "reserved",
      header: "Reserved",
      cell: ({ row }) => (
        <span className="tabular-nums text-purple-700">{row.original.reserved}</span>
      ),
    },
    {
      accessorKey: "maintenance",
      header: "Maintenance",
      cell: ({ row }) => (
        <span className="tabular-nums text-amber-700">{row.original.maintenance}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild type="button" variant="outline" size="sm">
            <Link href={`/admin/fleet/type/${row.original.vehicleId}`}>View units</Link>
          </Button>
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href={`/admin/fleet/new?vehicleId=${row.original.vehicleId}`}>Add units</Link>
          </Button>
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href={`/admin/vehicles/${row.original.vehicleId}/edit`}>Edit type</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href="/admin/fleet/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Vehicle
          </Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No fleet units yet. Add physical cars under a vehicle type.
        </p>
      ) : (
        <DataTable data={rows} columns={columns} />
      )}
    </>
  );
}
