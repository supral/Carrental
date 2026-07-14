"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignOfferToVehicle,
  createAndAssignOfferToVehicle,
  listAssignableOffers,
  previewOfferForVehicle,
  removeOfferFromVehicle,
  type AssignableOfferOption,
} from "@/lib/admin/offer-actions";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingLabel } from "@/components/ui/loading";
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
import OfferTemplateForm, { type OfferTemplateFormState } from "@/components/admin/OfferTemplateForm";

type DialogMode = "assign" | "create";

interface AssignVehicleOfferDialogProps {
  vehicleId: string;
  vehicleTitle: string;
  vehiclePrice: number;
  currentOfferName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers?: AssignableOfferOption[];
}

const EMPTY_OFFER: OfferTemplateFormState = {
  name: "",
  offerType: "",
  offerDiscountType: "AMOUNT",
  offerAmount: null,
  offerPercent: null,
  offerStartDate: null,
  offerEndDate: null,
  isEnabled: true,
};

export default function AssignVehicleOfferDialog({
  vehicleId,
  vehicleTitle,
  vehiclePrice,
  currentOfferName,
  open,
  onOpenChange,
  offers: initialOffers,
}: AssignVehicleOfferDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<DialogMode>("assign");
  const [offers, setOffers] = useState<AssignableOfferOption[]>(initialOffers ?? []);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [newOffer, setNewOffer] = useState<OfferTemplateFormState>(EMPTY_OFFER);
  const [preview, setPreview] = useState<{
    originalPrice: number;
    discount: number;
    finalPrice: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadOffers = async () => {
    if (initialOffers?.length) {
      setOffers(initialOffers);
      return;
    }
    const rows = await listAssignableOffers();
    setOffers(rows);
  };

  const resetState = () => {
    setError("");
    setSelectedOfferId("");
    setPreview(null);
    setNewOffer(EMPTY_OFFER);
    setMode("assign");
  };

  const handleOpen = (next: boolean) => {
    if (next) {
      resetState();
      void loadOffers();
    }
    onOpenChange(next);
  };

  const handleOfferChange = (offerId: string) => {
    setSelectedOfferId(offerId);
    setError("");
    if (!offerId) {
      setPreview(null);
      return;
    }
    startTransition(async () => {
      try {
        const result = await previewOfferForVehicle(vehicleId, offerId);
        setPreview(result);
      } catch {
        setPreview(null);
      }
    });
  };

  const handleAssign = () => {
    if (!selectedOfferId) {
      setError("Select an offer to assign.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await assignOfferToVehicle(vehicleId, selectedOfferId);
        handleOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign offer");
      }
    });
  };

  const handleCreate = () => {
    setError("");
    startTransition(async () => {
      try {
        await createAndAssignOfferToVehicle(vehicleId, newOffer);
        handleOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create offer");
      }
    });
  };

  const handleRemove = () => {
    setError("");
    startTransition(async () => {
      try {
        await removeOfferFromVehicle(vehicleId);
        handleOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove offer");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Offer" : "Assign Offer"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new offer and assign it only to this vehicle."
              : "Choose an existing offer from Marketing → Offers."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{vehicleTitle}</p>
          <p className="text-sm">
            List price: <strong>{formatPrice(vehiclePrice)}</strong>
          </p>

          {currentOfferName && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              Current offer: <strong>{currentOfferName}</strong>
            </p>
          )}

          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("assign");
                setError("");
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "assign"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Assign existing
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setError("");
                setPreview(null);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "create"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create new
            </button>
          </div>

          {mode === "assign" ? (
            <>
              <div>
                <Label className="mb-1.5 block">Select offer</Label>
                <Select value={selectedOfferId} onValueChange={handleOfferChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from Marketing → Offers" />
                  </SelectTrigger>
                  <SelectContent>
                    {offers.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No offers available — switch to Create new
                      </SelectItem>
                    ) : (
                      offers.map((offer) => (
                        <SelectItem key={offer.id} value={offer.id}>
                          {offer.label} · {offer.offerType} · {offer.discountLabel}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {preview && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm">
                  <p className="text-muted-foreground line-through">
                    {formatPrice(preview.originalPrice)}
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {formatPrice(preview.finalPrice)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Saves {formatPrice(preview.discount)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <OfferTemplateForm
              value={newOffer}
              onChange={setNewOffer}
              previewPrice={vehiclePrice}
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          {currentOfferName && mode === "assign" && (
            <Button variant="outline" onClick={handleRemove} disabled={isPending}>
              Remove offer
            </Button>
          )}
          {mode === "assign" ? (
            <Button onClick={handleAssign} disabled={isPending || !selectedOfferId}>
              {isPending ? <LoadingLabel label="Saving..." /> : "Assign offer"}
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? (
                <LoadingLabel label="Creating..." />
              ) : (
                "Create & assign to this vehicle"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
