"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { updateVehicleStatus, toggleVehicleFeatured, deleteVehicle } from "@/lib/admin/actions";
import { VehicleStatus } from "@prisma/client";
import { LISTING_PURPOSE_LABELS, ListingPurpose, type ListingPurpose as ListingPurposeType } from "@/lib/admin/vehicle-schema";
import { formatRentalAvailabilityWindow } from "@/lib/rentals/availability-window";
import { resolveVehicleOffer, type SeasonOfferTemplateLike } from "@/lib/vehicles/vehicle-offers";
import type { AssignableOfferOption } from "@/lib/admin/offer-actions";
import AssignVehicleOfferDialog from "@/components/admin/AssignVehicleOfferDialog";
import BulkAssignOfferDialog from "@/components/admin/BulkAssignOfferDialog";
import { Star, Check, X, Trash2, Tag, Tags, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export type VehicleRow = {
  id: string;
  title: string;
  vehicleNumber: string | null;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  status: VehicleStatus;
  listingPurpose: ListingPurposeType;
  featured: boolean;
  rentalAvailableFrom: Date | null;
  rentalAvailableTo: Date | null;
  totalUnits: number;
  availableUnits: number;
  seasonOfferId: string | null;
  seasonOffer: SeasonOfferTemplateLike | null;
  isOnOffer: boolean;
  offerType: string | null;
  offerAmount: unknown;
  offerStartDate: Date | null;
  offerEndDate: Date | null;
  discountedPrice: unknown;
  dealer: { name: string };
  createdAt: Date;
};

const statusColors: Record<VehicleStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SOLD: "bg-blue-100 text-blue-800",
};

const purposeColors: Record<ListingPurposeType, string> = {
  SALE: "bg-red-100 text-red-800",
  RENTAL: "bg-purple-100 text-purple-800",
};

function getRowOffer(row: VehicleRow) {
  return resolveVehicleOffer({
    price: row.price,
    seasonOffer: row.seasonOffer,
    isOnOffer: row.isOnOffer,
    offerType: row.offerType,
    offerAmount: row.offerAmount as number | null,
    discountedPrice: row.discountedPrice as number | null,
    offerStartDate: row.offerStartDate,
    offerEndDate: row.offerEndDate,
  });
}

export type VehicleListFilter = "all" | "active" | "sold" | "sale" | "rental";

const FILTER_LABELS: Record<VehicleListFilter, string> = {
  all: "All",
  active: "Active",
  sold: "Sold",
  sale: "For Sale",
  rental: "Rental",
};

const RENTAL_FILTER_LABELS: Record<"all" | "active", string> = {
  all: "All",
  active: "Active",
};

function matchesFilter(vehicle: VehicleRow, filter: VehicleListFilter): boolean {
  switch (filter) {
    case "active":
      return vehicle.status === VehicleStatus.ACTIVE;
    case "sold":
      return vehicle.status === VehicleStatus.SOLD;
    case "sale":
      return (
        vehicle.listingPurpose === ListingPurpose.SALE &&
        vehicle.status !== VehicleStatus.SOLD
      );
    case "rental":
      return vehicle.listingPurpose === ListingPurpose.RENTAL;
    default:
      return true;
  }
}

function matchesSearch(vehicle: VehicleRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    vehicle.title,
    vehicle.make,
    vehicle.model,
    vehicle.vehicleNumber ?? "",
    vehicle.dealer.name,
    String(vehicle.year),
    vehicle.id,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function countByFilter(vehicles: VehicleRow[], filter: VehicleListFilter): number {
  return vehicles.filter((vehicle) => matchesFilter(vehicle, filter)).length;
}

function isSoldSaleVehicle(row: VehicleRow) {
  return row.listingPurpose === ListingPurpose.SALE && row.status === VehicleStatus.SOLD;
}

function renderOfferCell(
  row: VehicleRow,
  onAssign: (dialog: {
    vehicleId: string;
    title: string;
    price: number;
    currentOfferName: string | null;
  }) => void
) {
  if (isSoldSaleVehicle(row)) {
    return (
      <p className="text-xs text-muted-foreground">
        Sold — offer removed
      </p>
    );
  }

  const offer = getRowOffer(row);
  const templateName = row.seasonOffer?.name;

  return (
    <div className="space-y-2">
      {offer.isOnOffer && offer.offerType ? (
        <div className="space-y-1">
          {templateName && (
            <p className="text-xs font-medium text-gray-700">{templateName}</p>
          )}
          <Badge className="bg-red-600 text-white">{offer.offerType}</Badge>
          <p className="text-xs text-muted-foreground">
            -{formatPrice(offer.savingsAmount)}
            {offer.offerEndDate
              ? ` · ends ${format(new Date(offer.offerEndDate), "dd MMM yyyy")}`
              : ""}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No offer assigned</p>
      )}
      {renderOfferActionButton(row, onAssign, templateName)}
    </div>
  );
}

function renderOfferActionButton(
  row: VehicleRow,
  onAssign: (dialog: {
    vehicleId: string;
    title: string;
    price: number;
    currentOfferName: string | null;
  }) => void,
  templateName?: string | null,
  className = "h-8"
) {
  if (isSoldSaleVehicle(row)) return null;

  const label = templateName ? "Change offer" : "Add offer";
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() =>
        onAssign({
          vehicleId: row.id,
          title: row.title,
          price: row.price,
          currentOfferName: templateName ?? row.seasonOffer?.name ?? null,
        })
      }
    >
      <Tag className="mr-1 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function renderSaleOfferLink(
  row: VehicleRow,
  onAssign: (dialog: {
    vehicleId: string;
    title: string;
    price: number;
    currentOfferName: string | null;
  }) => void
) {
  if (isSoldSaleVehicle(row)) return null;

  const templateName = row.seasonOffer?.name;
  const label = templateName ? "Change offer" : "Add offer";
  return (
    <button
      type="button"
      className="mt-1 inline-flex items-center text-xs font-medium text-primary hover:underline"
      onClick={() =>
        onAssign({
          vehicleId: row.id,
          title: row.title,
          price: row.price,
          currentOfferName: templateName ?? null,
        })
      }
    >
      <Tag className="mr-0.5 h-3 w-3" />
      {label}
    </button>
  );
}

function getTableMode(filter: VehicleListFilter): "sale" | "rental" | "mixed" {
  if (filter === "sale" || filter === "sold") return "sale";
  if (filter === "rental") return "rental";
  return "mixed";
}

export default function VehiclesTable({
  vehicles,
  assignableOffers = [],
  canApprove = false,
  canManage = false,
  rentalOnly = false,
}: {
  vehicles: VehicleRow[];
  assignableOffers?: AssignableOfferOption[];
  canApprove?: boolean;
  canManage?: boolean;
  rentalOnly?: boolean;
}) {
  const [filter, setFilter] = useState<VehicleListFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkOfferOpen, setBulkOfferOpen] = useState(false);
  const [offerDialog, setOfferDialog] = useState<{
    vehicleId: string;
    title: string;
    price: number;
    currentOfferName: string | null;
  } | null>(null);

  const counts = useMemo(
    () =>
      rentalOnly
        ? {
            all: vehicles.length,
            active: countByFilter(vehicles, "active"),
          }
        : {
            all: vehicles.length,
            active: countByFilter(vehicles, "active"),
            sold: countByFilter(vehicles, "sold"),
            sale: countByFilter(vehicles, "sale"),
            rental: countByFilter(vehicles, "rental"),
          },
    [vehicles, rentalOnly]
  );

  const tabFilteredVehicles = useMemo(
    () => vehicles.filter((vehicle) => matchesFilter(vehicle, filter)),
    [vehicles, filter]
  );

  const filteredVehicles = useMemo(
    () => tabFilteredVehicles.filter((vehicle) => matchesSearch(vehicle, searchQuery)),
    [tabFilteredVehicles, searchQuery]
  );

  const bulkSaleVehicleIds = useMemo(
    () =>
      filteredVehicles
        .filter(
          (vehicle) =>
            vehicle.listingPurpose === ListingPurpose.SALE &&
            vehicle.status !== VehicleStatus.SOLD
        )
        .map((vehicle) => vehicle.id),
    [filteredVehicles]
  );

  const canBulkAssign = bulkSaleVehicleIds.length > 0;

  const tableMode = rentalOnly ? "rental" : getTableMode(filter);

  const columns = useMemo<ColumnDef<VehicleRow>[]>(() => {
    const vehicleColumn: ColumnDef<VehicleRow> = {
      accessorKey: "title",
      header: "Vehicle",
      cell: ({ row }) => (
        <div>
          <Link href={`/vehicles/${row.original.id}`} className="font-medium hover:text-primary">
            {row.original.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {row.original.make} {row.original.model}
            {tableMode !== "rental" && row.original.vehicleNumber
              ? ` · ${row.original.vehicleNumber}`
              : ""}
          </p>
          {tableMode === "rental" ? (
            <Link
              href={`/admin/vehicles/${row.original.id}/edit`}
              className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
            >
              Edit rental options
            </Link>
          ) : (
            renderSaleOfferLink(row.original, setOfferDialog)
          )}
        </div>
      ),
    };

    const yearColumn: ColumnDef<VehicleRow> = { accessorKey: "year", header: "Year" };

    const priceColumn: ColumnDef<VehicleRow> = {
      accessorKey: "price",
      header: tableMode === "rental" ? "Daily Rate" : "Price",
      cell: ({ row }) => {
        const isRental =
          tableMode === "rental" || row.original.listingPurpose === ListingPurpose.RENTAL;
        const offer = getRowOffer(row.original);

        if (!isRental && !isSoldSaleVehicle(row.original) && offer.isOnOffer) {
          return (
            <div>
              <span className="block text-xs text-muted-foreground line-through">
                {formatPrice(offer.originalPrice)}
              </span>
              <span className="font-semibold text-red-600">{formatPrice(offer.displayPrice)}</span>
            </div>
          );
        }

        return (
          <span>
            {formatPrice(row.original.price)}
            {isRental && <span className="text-xs text-muted-foreground">/day</span>}
          </span>
        );
      },
    };

    const offerColumn: ColumnDef<VehicleRow> = {
      id: "offer",
      header: "Offer",
      cell: ({ row }) => renderOfferCell(row.original, setOfferDialog),
    };

    const purposeColumn: ColumnDef<VehicleRow> = {
      accessorKey: "listingPurpose",
      header: "Purpose",
      cell: ({ row }) => (
        <Badge className={purposeColors[row.original.listingPurpose]}>
          {LISTING_PURPOSE_LABELS[row.original.listingPurpose]}
        </Badge>
      ),
    };

    const totalUnitsColumn: ColumnDef<VehicleRow> = {
      id: "totalUnits",
      header: "Total Units",
      cell: ({ row }) => <span>{row.original.totalUnits}</span>,
    };

    const availableUnitsColumn: ColumnDef<VehicleRow> = {
      id: "availableUnits",
      header: "Available",
      cell: ({ row }) => (
        <span className="font-medium text-green-700">{row.original.availableUnits}</span>
      ),
    };

    const bookedUnitsColumn: ColumnDef<VehicleRow> = {
      id: "bookedUnits",
      header: "Booked",
      cell: ({ row }) => (
        <span className="font-medium text-amber-700">
          {row.original.totalUnits - row.original.availableUnits}
        </span>
      ),
    };

    const listedSinceColumn: ColumnDef<VehicleRow> = {
      id: "rentalListed",
      header: "Listed Since",
      cell: ({ row }) => {
        const from = row.original.rentalAvailableFrom ?? row.original.createdAt;
        const label = formatRentalAvailabilityWindow(from);
        return (
          <span className="text-xs text-muted-foreground">{label || "—"}</span>
        );
      },
    };

    const kmColumn: ColumnDef<VehicleRow> = {
      accessorKey: "mileage",
      header: "Km",
      cell: ({ row }) => row.original.mileage.toLocaleString(),
    };

    const dealerColumn: ColumnDef<VehicleRow> = {
      accessorKey: "dealer.name",
      header: "Dealer",
      cell: ({ row }) => row.original.dealer.name,
    };

    const statusColumn: ColumnDef<VehicleRow> = {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status]}>{row.original.status}</Badge>
      ),
    };

    const createdColumn: ColumnDef<VehicleRow> = {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => format(new Date(row.original.createdAt), "dd MMM yyyy"),
    };

    const actionsColumn: ColumnDef<VehicleRow> = {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isSale =
          tableMode === "sale" || row.original.listingPurpose === ListingPurpose.SALE;

        return (
          <div className="flex items-center gap-1">
            {canApprove && row.original.status === VehicleStatus.PENDING && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateVehicleStatus(row.original.id, VehicleStatus.ACTIVE)}
                  title="Approve"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateVehicleStatus(row.original.id, VehicleStatus.REJECTED)}
                  title="Reject"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleVehicleFeatured(row.original.id, !row.original.featured)}
              title="Feature"
            >
              <Star
                className={`h-4 w-4 ${row.original.featured ? "fill-primary text-primary" : ""}`}
              />
            </Button>
            {isSale && tableMode !== "rental" && !isSoldSaleVehicle(row.original) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setOfferDialog({
                    vehicleId: row.original.id,
                    title: row.original.title,
                    price: row.original.price,
                    currentOfferName: row.original.seasonOffer?.name ?? null,
                  })
                }
                title={row.original.seasonOffer?.name ? "Change offer" : "Add offer"}
              >
                <Tag className="h-4 w-4 text-red-600" />
              </Button>
            )}
            {isSale && tableMode !== "rental" && row.original.status !== VehicleStatus.SOLD && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateVehicleStatus(row.original.id, VehicleStatus.SOLD)}
                title="Mark Sold"
              >
                Sold
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteVehicle(row.original.id)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        );
      },
    };

    if (tableMode === "sale") {
      return [
        vehicleColumn,
        yearColumn,
        priceColumn,
        offerColumn,
        kmColumn,
        dealerColumn,
        statusColumn,
        createdColumn,
        actionsColumn,
      ];
    }

    if (tableMode === "rental") {
      return [
        vehicleColumn,
        yearColumn,
        priceColumn,
        totalUnitsColumn,
        availableUnitsColumn,
        bookedUnitsColumn,
        listedSinceColumn,
        kmColumn,
        dealerColumn,
        statusColumn,
        actionsColumn,
      ];
    }

    // Mixed view (All / Active): purpose column + contextual cells
    return [
      {
        ...vehicleColumn,
        cell: ({ row }) => (
          <div>
            <Link href={`/vehicles/${row.original.id}`} className="font-medium hover:text-primary">
              {row.original.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              {row.original.make} {row.original.model}
              {row.original.listingPurpose === ListingPurpose.SALE && row.original.vehicleNumber
                ? ` · ${row.original.vehicleNumber}`
                : ""}
            </p>
            {row.original.listingPurpose === ListingPurpose.RENTAL ? (
              <Link
                href={`/admin/vehicles/${row.original.id}/edit`}
                className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
              >
                Edit rental options
              </Link>
            ) : (
              renderSaleOfferLink(row.original, setOfferDialog)
            )}
          </div>
        ),
      },
      yearColumn,
      priceColumn,
      {
        id: "offer",
        header: "Offer",
        cell: ({ row }) =>
          row.original.listingPurpose === ListingPurpose.SALE ? (
            renderOfferCell(row.original, setOfferDialog)
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      purposeColumn,
      {
        ...totalUnitsColumn,
        cell: ({ row }) =>
          row.original.listingPurpose === ListingPurpose.RENTAL ? (
            <span>{row.original.totalUnits}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        ...availableUnitsColumn,
        cell: ({ row }) =>
          row.original.listingPurpose === ListingPurpose.RENTAL ? (
            <span className="font-medium text-green-700">{row.original.availableUnits}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        ...bookedUnitsColumn,
        cell: ({ row }) =>
          row.original.listingPurpose === ListingPurpose.RENTAL ? (
            <span className="font-medium text-amber-700">
              {row.original.totalUnits - row.original.availableUnits}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        ...listedSinceColumn,
        cell: ({ row }) => {
          if (row.original.listingPurpose !== ListingPurpose.RENTAL) {
            return <span className="text-muted-foreground">—</span>;
          }
          const from = row.original.rentalAvailableFrom ?? row.original.createdAt;
          const label = formatRentalAvailabilityWindow(from);
          return (
            <span className="text-xs text-muted-foreground">{label || "—"}</span>
          );
        },
      },
      kmColumn,
      dealerColumn,
      statusColumn,
      createdColumn,
      actionsColumn,
    ];
  }, [tableMode, canApprove]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-sm lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, make, model, VIN..."
              className="pl-9"
              aria-label="Search vehicles"
            />
          </div>

          <Select value={filter} onValueChange={(value) => setFilter(value as VehicleListFilter)}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter vehicles">
              <SelectValue placeholder="Filter vehicles" />
            </SelectTrigger>
            <SelectContent>
              {(rentalOnly
                ? (Object.keys(RENTAL_FILTER_LABELS) as Array<"all" | "active">)
                : (Object.keys(FILTER_LABELS) as VehicleListFilter[])
              ).map((key) => (
                <SelectItem key={key} value={key}>
                  {(rentalOnly ? RENTAL_FILTER_LABELS[key as "all" | "active"] : FILTER_LABELS[key])} (
                  {counts[key as keyof typeof counts]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManage && !rentalOnly && filter !== "rental" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 w-full shrink-0 gap-1.5 px-3 font-normal sm:w-auto"
              onClick={() => setBulkOfferOpen(true)}
              disabled={!canBulkAssign}
              title="Assign offer to all eligible vehicles"
            >
              <Tags className="h-4 w-4 shrink-0" />
              Assign{canBulkAssign ? ` (${bulkSaleVehicleIds.length})` : ""}
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filteredVehicles.length} of {tabFilteredVehicles.length} vehicles
          {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ""}
          {canManage && !rentalOnly && filter !== "rental" && canBulkAssign && (
            <span> · {bulkSaleVehicleIds.length} eligible for bulk offer</span>
          )}
        </p>
      </div>

      <DataTable data={filteredVehicles} columns={columns} />
      {offerDialog && (
        <AssignVehicleOfferDialog
          vehicleId={offerDialog.vehicleId}
          vehicleTitle={offerDialog.title}
          vehiclePrice={offerDialog.price}
          currentOfferName={offerDialog.currentOfferName}
          open={!!offerDialog}
          onOpenChange={(open) => !open && setOfferDialog(null)}
          offers={assignableOffers}
        />
      )}
      <BulkAssignOfferDialog
        open={bulkOfferOpen}
        onOpenChange={setBulkOfferOpen}
        offers={assignableOffers}
        vehicleIds={bulkSaleVehicleIds}
        vehicleCount={bulkSaleVehicleIds.length}
        scopeLabel={FILTER_LABELS[filter]}
      />
    </>
  );
}
