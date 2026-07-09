"use client";

import { useMemo } from "react";
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
  type OfferDiscountType,
  type SeasonOfferTemplateInput,
} from "@/lib/vehicles/vehicle-offers";

export type OfferTemplateFormState = SeasonOfferTemplateInput;

interface OfferTemplateFormProps {
  value: OfferTemplateFormState;
  onChange: (value: OfferTemplateFormState) => void;
  /** Example vehicle price for percentage preview */
  previewPrice?: number;
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function OfferTemplateForm({
  value,
  onChange,
  previewPrice = 64990,
}: OfferTemplateFormProps) {
  const discountType = value.offerDiscountType || "AMOUNT";

  const preview = useMemo(() => {
    const price = previewPrice;
    let amount = 0;
    let valid = false;

    if (discountType === "PERCENT") {
      const percent = Number(value.offerPercent) || 0;
      valid = percent > 0 && percent <= 100;
      amount = valid ? Math.round((price * percent) / 100) : 0;
    } else {
      amount = Number(value.offerAmount) || 0;
      valid = amount > 0 && amount <= price;
    }

    const finalPrice = valid ? price - amount : price;
    const savingsPercent = valid && price > 0 ? Math.round((amount / price) * 100) : 0;

    return { valid, amount, finalPrice, savingsPercent };
  }, [value.offerAmount, value.offerPercent, discountType, previewPrice]);

  const setDiscountType = (type: OfferDiscountType) => {
    onChange({
      ...value,
      offerDiscountType: type,
      offerAmount: type === "AMOUNT" ? value.offerAmount : null,
      offerPercent: type === "PERCENT" ? value.offerPercent : null,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block">Offer Name</Label>
          <Input
            value={value.name || ""}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="e.g. Dashain 2026 Promo"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Internal name — assign this offer to vehicles from Vehicle Management.
          </p>
        </div>

        <div>
          <Label className="mb-1.5 block">Offer Type (badge label)</Label>
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
          </div>
        )}

        <div>
          <Label className="mb-1.5 block">Start Date</Label>
          <Input
            type="date"
            value={toDateInputValue(value.offerStartDate)}
            onChange={(e) =>
              onChange({ ...value, offerStartDate: e.target.value || null })
            }
          />
        </div>

        <div>
          <Label className="mb-1.5 block">End Date</Label>
          <Input
            type="date"
            value={toDateInputValue(value.offerEndDate)}
            onChange={(e) =>
              onChange({ ...value, offerEndDate: e.target.value || null })
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Example preview
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          Based on a {formatPrice(previewPrice)} vehicle — actual price is calculated per car when assigned.
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Original Price</dt>
            <dd className="text-lg font-semibold">{formatPrice(previewPrice)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="text-lg font-semibold text-amber-700">
              {preview.valid ? formatPrice(preview.amount) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">You Save</dt>
            <dd className="text-lg font-semibold text-green-700">
              {preview.valid ? `${preview.savingsPercent}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Final Price</dt>
            <dd className="text-2xl font-bold text-red-600">
              {preview.valid ? formatPrice(preview.finalPrice) : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
