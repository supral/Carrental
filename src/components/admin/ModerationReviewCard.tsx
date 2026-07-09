"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, formatMileage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addModeratorNote, updateVehicleStatus } from "@/lib/admin/actions";
import { VehicleStatus } from "@prisma/client";

type ModerationVehicle = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  condition: string;
  color: string | null;
  location: string;
  description: string;
  features: string[];
  detailSections?: Array<{ id: string; title: string; content: string }>;
  imageUrl: string | null;
  dealerName: string;
  createdByName: string | null;
  createdAt: string;
  listingPurpose: string;
  notes: Array<{ id: string; authorName: string; content: string; createdAt: string }>;
};

export default function ModerationReviewCard({ vehicle }: { vehicle: ModerationVehicle }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submitNote = () => {
    if (!note.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        await addModeratorNote(vehicle.id, note.trim());
        setNote("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add note");
      }
    });
  };

  const setStatus = (status: VehicleStatus) => {
    startTransition(async () => {
      await updateVehicleStatus(vehicle.id, status);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="relative aspect-video lg:aspect-auto lg:min-h-[240px] bg-muted">
          {vehicle.imageUrl && (
            <Image src={vehicle.imageUrl} alt={vehicle.title} fill className="object-cover" unoptimized={vehicle.imageUrl.startsWith("/uploads/")} />
          )}
        </div>
        <div className="lg:col-span-2 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">{vehicle.title}</h3>
              <p className="text-2xl font-bold text-primary mt-1">{formatPrice(vehicle.price)}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/vehicles">View in vehicles</Link>
            </Button>
            {vehicle.listingPurpose === "RENTAL" && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/vehicles/${vehicle.id}/edit`}>Edit rental options</Link>
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <p><span className="text-muted-foreground">Year:</span> {vehicle.year}</p>
            <p><span className="text-muted-foreground">Mileage:</span> {formatMileage(vehicle.mileage)}</p>
            <p><span className="text-muted-foreground">Fuel:</span> {vehicle.fuelType}</p>
            <p><span className="text-muted-foreground">Transmission:</span> {vehicle.transmission}</p>
            <p><span className="text-muted-foreground">Body:</span> {vehicle.bodyType}</p>
            <p><span className="text-muted-foreground">Condition:</span> {vehicle.condition}</p>
            <p><span className="text-muted-foreground">Color:</span> {vehicle.color || "—"}</p>
            <p><span className="text-muted-foreground">Location:</span> {vehicle.location}</p>
            <p><span className="text-muted-foreground">Dealer:</span> {vehicle.dealerName}</p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Submitted by <strong>{vehicle.createdByName ?? "Unknown"}</strong> on{" "}
            {new Date(vehicle.createdAt).toLocaleString()}
          </p>

          {vehicle.detailSections && vehicle.detailSections.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Details</p>
              {vehicle.detailSections.map((section) => (
                <div key={section.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium">{section.title}</p>
                  <p className="mt-1 text-muted-foreground line-clamp-3 whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed">{vehicle.description}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button disabled={isPending} onClick={() => setStatus(VehicleStatus.ACTIVE)}>
              Approve & publish
            </Button>
            <Button disabled={isPending} variant="outline" onClick={() => setStatus(VehicleStatus.REJECTED)}>
              Reject
            </Button>
          </div>

          <div className="mt-6 border-t pt-4">
            <p className="text-sm font-medium mb-2">Verification notes</p>
            {vehicle.notes.map((entry) => (
              <p key={entry.id} className="text-sm text-muted-foreground mb-1">
                — {entry.authorName}: {entry.content}
              </p>
            ))}
            <div className="mt-3 flex gap-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note incorrect details or required fixes..."
              />
              <Button type="button" variant="secondary" disabled={isPending} onClick={submitNote}>
                Add note
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
