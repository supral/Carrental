"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { FleetVehicleStatus } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { deleteFleetVehicle } from "@/lib/admin/fleet-vehicle-actions";

export type FleetVehicleRow = {
  id: string;
  fleetNumber: string;
  registrationNumber: string | null;
  vinNumber: string | null;
  status: FleetVehicleStatus;
  branch: string | null;
  odometer: number | null;
  color: string | null;
  vehicleId: string;
  vehicleName: string;
  dailyPrice: number;
  createdAt: string;
};

const STATUS_CLASS: Record<FleetVehicleStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  RENTED: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-amber-100 text-amber-800",
  RESERVED: "bg-purple-100 text-purple-800",
  INACTIVE: "bg-gray-100 text-gray-700",
};

export default function FleetVehiclesTable({ rows }: { rows: FleetVehicleRow[] }) {
  const { toast } = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<FleetVehicleRow>[]>(
    () => [
      {
        accessorKey: "fleetNumber",
        header: "Fleet #",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.fleetNumber}</p>
            <p className="text-xs text-muted-foreground">{row.original.registrationNumber || "No plate"}</p>
          </div>
        ),
      },
      {
        accessorKey: "vehicleName",
        header: "Vehicle type",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.vehicleName}</p>
            <Link
              href={`/admin/vehicles/${row.original.vehicleId}/edit`}
              className="text-xs text-primary hover:underline"
            >
              Edit type
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "branch",
        header: "Branch",
        cell: ({ row }) => row.original.branch || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={STATUS_CLASS[row.original.status]}>{row.original.status}</Badge>
        ),
      },
      {
        accessorKey: "odometer",
        header: "Odometer",
        cell: ({ row }) =>
          row.original.odometer != null ? `${row.original.odometer.toLocaleString()} km` : "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button asChild type="button" variant="ghost" size="sm">
              <Link href={`/admin/fleet/${row.original.id}/history`}>History</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

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
      <DataTable data={rows} columns={columns} />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete fleet unit?"
        description="This removes the physical vehicle from the fleet. Active bookings cannot be deleted."
        confirmLabel="Delete"
        destructive
        isPending={pending}
        onConfirm={() => {
          if (!deleteId) return;
          startTransition(async () => {
            try {
              await deleteFleetVehicle(deleteId);
              toast({ type: "success", message: "Fleet unit deleted" });
              setDeleteId(null);
              window.location.reload();
            } catch (error) {
              toast({
                type: "error",
                message: error instanceof Error ? error.message : "Delete failed",
              });
            }
          });
        }}
      />
    </>
  );
}
