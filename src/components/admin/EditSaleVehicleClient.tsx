"use client";

import { useState } from "react";
import Link from "next/link";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AssignVehicleOfferDialog from "@/components/admin/AssignVehicleOfferDialog";
import type { AssignableOfferOption } from "@/lib/admin/offer-actions";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EditSaleVehicleClientProps {
  vehicle: {
    id: string;
    title: string;
    price: number;
    seasonOfferName: string | null;
    seasonOfferType: string | null;
  };
  assignableOffers: AssignableOfferOption[];
}

export default function EditSaleVehicleClient({
  vehicle,
  assignableOffers,
}: EditSaleVehicleClientProps) {
  const [dialogOpen, setDialogOpen] = useState(true);

  return (
    <div>
      <AdminBreadcrumbs
        items={[
          { label: "Vehicles", href: "/admin/vehicles" },
          { label: vehicle.title },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assign Offer</h1>
          <p className="text-muted-foreground">{vehicle.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            List price: {formatPrice(vehicle.price)}
          </p>
          {vehicle.seasonOfferName && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current:</span>
              <Badge className="bg-red-600 text-white">
                {vehicle.seasonOfferType ?? vehicle.seasonOfferName}
              </Badge>
              <span className="text-sm">{vehicle.seasonOfferName}</span>
            </div>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/vehicles">Back to Vehicles</Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Offers are created in <Link href="/admin/marketing/offers" className="text-primary hover:underline">Marketing → Offers</Link>,
        then assigned to vehicles here or from the Vehicle Management table.
      </div>

      <AssignVehicleOfferDialog
        vehicleId={vehicle.id}
        vehicleTitle={vehicle.title}
        vehiclePrice={vehicle.price}
        currentOfferName={vehicle.seasonOfferName}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        offers={assignableOffers}
      />
    </div>
  );
}
