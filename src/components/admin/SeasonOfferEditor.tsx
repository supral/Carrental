"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import {
  VEHICLE_OFFER_TYPES,
  computeOfferDiscountAmount,
  type OfferDiscountType,
  type SeasonOfferInput,
} from "@/lib/vehicles/vehicle-offers";

export type SeasonOfferFormState = SeasonOfferInput;

interface SeasonOfferEditorProps {
  originalPrice: number;
  value: SeasonOfferFormState;
  onChange: (value: SeasonOfferFormState) => void;
  showEnableToggle?: boolean;
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function SeasonOfferEditor({
  originalPrice,
  value,
  onChange,
  showEnableToggle = true,
}: SeasonOfferEditorProps) {
  const discountType = value.offerDiscountType || "AMOUNT";

  const preview = useMemo(() => {
    const hasPrice = originalPrice > 0;
    let amount = 0;
    let discountValid = false;

    if (value.isOnOffer && hasPrice) {
      try {
        amount = computeOfferDiscountAmount(originalPrice, value);
        discountValid = amount > 0 && amount <= originalPrice;
      } catch {
        discountValid = false;
      }
    }

    const hasDiscount = value.isOnOffer && amount > 0;
    const finalPrice = discountValid ? originalPrice - amount : hasPrice ? originalPrice : 0;
    const savingsPercent =
      discountValid && originalPrice > 0 ? Math.round((amount / originalPrice) * 100) : 0;

    return { hasPrice, hasDiscount, discountValid, amount, finalPrice, savingsPercent };
  }, [value, originalPrice]);

  const handleEnableChange = (checked: boolean) => {
    if (checked) {
      onChange({
        ...value,
        isOnOffer: true,
        offerType: value.offerType || VEHICLE_OFFER_TYPES[0],
        offerDiscountType: value.offerDiscountType || "AMOUNT",
      });
      return;
    }
    onChange({ isOnOffer: false });
  };

  const setDiscountType = (type: OfferDiscountType) => {
    onChange({
      ...value,
      offerDiscountType: type,
      offerAmount: type === "AMOUNT" ? value.offerAmount : null,
      offerPercent: type === "PERCENT" ? value.offerPercent : null,
    });
  };

  const fieldsVisible = showEnableToggle ? value.isOnOffer : true;

  return (
    <div className="space-y-5">
      {showEnableToggle && (
        <label className="flex items-center gap-3 rounded-lg border border-border p-4">
          <Checkbox checked={value.isOnOffer} onCheckedChange={handleEnableChange} />
          <div>
            <p className="font-medium">Enable Season Offer</p>
            <p className="text-sm text-muted-foreground">
              When saved, this offer applies to this vehicle on the website and appears under Marketing → Offers.
            </p>
          </div>
        </label>
      )}

      {fieldsVisible && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block">Offer Type</Label>
            <Select
              value={value.offerType || ""}
              onValueChange={(offerType) => onChange({ ...value, offerType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select offer type" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_OFFER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Discount Type</Label>
            <Select
              value={discountType}
              onValueChange={(type) => setDiscountType(type as OfferDiscountType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AMOUNT">Fixed amount ($)</SelectItem>
                <SelectItem value="PERCENT">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {discountType === "AMOUNT" ? (
            <div>
              <Label className="mb-1.5 block">Discount Amount (AUD)</Label>
              <Input
                type="number"
                min={1}
                max={originalPrice > 0 ? originalPrice : undefined}
                step={1}
                value={value.offerAmount ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    offerAmount: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="15000"
              />
            </div>
          ) : (
            <div>
              <Label className="mb-1.5 block">Discount Percentage (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={value.offerPercent ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    offerPercent: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="23"
              />
              {preview.discountValid && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Equals {formatPrice(preview.amount)} off
                </p>
              )}
            </div>
          )}

          <div>
            <Label className="mb-1.5 block">Offer Start Date</Label>
            <Input
              type="date"
              value={toDateInputValue(value.offerStartDate)}
              onChange={(e) =>
                onChange({
                  ...value,
                  offerStartDate: e.target.value || null,
                })
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">Optional — leave blank to start immediately.</p>
          </div>

          <div>
            <Label className="mb-1.5 block">Offer End Date</Label>
            <Input
              type="date"
              value={toDateInputValue(value.offerEndDate)}
              onChange={(e) =>
                onChange({
                  ...value,
                  offerEndDate: e.target.value || null,
                })
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">Optional — offer stays active until disabled.</p>
          </div>
        </div>
      )}

      {!preview.hasPrice && fieldsVisible && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Enter the vehicle sale price first — the preview and discount are calculated from that amount.
        </p>
      )}

      {fieldsVisible && preview.hasPrice && value.isOnOffer && !preview.discountValid && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {discountType === "PERCENT"
            ? "Enter a percentage between 1 and 100."
            : `Discount cannot exceed the sale price of ${formatPrice(originalPrice)}.`}
        </p>
      )}

      {fieldsVisible && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Original Price</dt>
              <dd className="text-lg font-semibold">
                {preview.hasPrice ? formatPrice(originalPrice) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="text-lg font-semibold text-amber-700">
                {preview.discountValid ? formatPrice(preview.amount) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">You Save</dt>
              <dd className="text-lg font-semibold text-green-700">
                {preview.discountValid ? `${preview.savingsPercent}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Final Price</dt>
              <dd className="text-2xl font-bold text-red-600">
                {preview.discountValid
                  ? formatPrice(preview.finalPrice)
                  : preview.hasPrice
                    ? formatPrice(originalPrice)
                    : "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
