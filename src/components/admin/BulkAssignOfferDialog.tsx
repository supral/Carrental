"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  bulkAssignOfferToVehicles,
  listAssignableOffers,
  type AssignableOfferOption,
} from "@/lib/admin/offer-actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkAssignOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: AssignableOfferOption[];
  vehicleIds: string[];
  vehicleCount: number;
  scopeLabel: string;
}

export default function BulkAssignOfferDialog({
  open,
  onOpenChange,
  offers: initialOffers,
  vehicleIds,
  vehicleCount,
  scopeLabel,
}: BulkAssignOfferDialogProps) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const [offers, setOffers] = useState<AssignableOfferOption[]>(initialOffers);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOffers(initialOffers);
  }, [initialOffers]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void listAssignableOffers()
      .then((rows) => {
        if (!cancelled) setOffers(rows);
      })
      .catch(() => {
        if (!cancelled) setOffers(initialOffers);
      });

    return () => {
      cancelled = true;
    };
  }, [open, initialOffers]);

  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId);

  const handleOpen = (next: boolean) => {
    if (!isPending) {
      if (next) {
        setError("");
        setSelectedOfferId("");
      }
      onOpenChange(next);
    }
  };

  const handleAssign = () => {
    if (!selectedOfferId) {
      setError("Select an offer to assign.");
      return;
    }
    if (vehicleCount === 0) {
      setError("No sale vehicles in the current tab to assign.");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const result = await bulkAssignOfferToVehicles(vehicleIds, selectedOfferId);
        onOpenChange(false);
        router.refresh();
        toast({
          type: "success",
          message: `Offer assigned to ${result.assigned} vehicle${result.assigned === 1 ? "" : "s"}${
            result.skipped > 0 ? ` (${result.skipped} skipped)` : ""
          }.`,
        });
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to assign offer",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Offer to All</DialogTitle>
          <DialogDescription>
            Apply one offer to every eligible sale vehicle in the current tab ({scopeLabel}). Sold and
            rental vehicles are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            <strong>{vehicleCount}</strong> sale vehicle{vehicleCount === 1 ? "" : "s"} will be
            updated.
            {selectedOffer ? (
              <span className="mt-1 block text-muted-foreground">
                Selected: <strong>{selectedOffer.label}</strong> ({selectedOffer.discountLabel} off)
              </span>
            ) : null}
          </p>

          {offers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">No offers available yet</p>
              <p className="mt-1 text-muted-foreground">
                Create a promotional offer first, then return here to assign it in bulk.
              </p>
              <Button asChild className="mt-3" size="sm">
                <Link href="/admin/marketing/offers">Create offer</Link>
              </Button>
            </div>
          ) : (
            <div>
              <Label className="mb-1.5 block">Select offer</Label>
              <Select
                value={selectedOfferId || undefined}
                onValueChange={setSelectedOfferId}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose from Marketing → Offers" />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.label} · {offer.offerType} · {offer.discountLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={handleAssign}
            disabled={isPending || !selectedOfferId || vehicleCount === 0 || offers.length === 0}
          >
            {isPending ? "Assigning..." : `Assign to all ${vehicleCount} cars`}
          </Button>
          <Button variant="outline" onClick={() => handleOpen(false)} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

