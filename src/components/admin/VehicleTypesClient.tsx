"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createVehicleType,
  deleteVehicleType,
  listVehicleTypes,
  updateVehicleType,
} from "@/lib/admin/vehicle-type-actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type VehicleTypeRow = Awaited<ReturnType<typeof listVehicleTypes>>[number];

interface VehicleTypesClientProps {
  initialTypes: VehicleTypeRow[];
}

export default function VehicleTypesClient({ initialTypes }: VehicleTypesClientProps) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const [types, setTypes] = useState(initialTypes);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VehicleTypeRow | null>(null);

  const filtered = types.filter((type) =>
    type.name.toLowerCase().includes(search.toLowerCase())
  );

  const refresh = () => {
    startTransition(async () => {
      const rows = await listVehicleTypes(search || undefined);
      setTypes(rows);
      router.refresh();
    });
  };

  const handleCreate = () => {
    setError("");
    startTransition(async () => {
      try {
        await createVehicleType({ name, description, icon });
        setName("");
        setDescription("");
        setIcon("");
        setShowCreate(false);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create vehicle type");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteVehicleType(deleteTarget.id);
        setDeleteTarget(null);
        refresh();
        toast({ type: "success", message: "Vehicle type deleted." });
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to delete vehicle type",
        });
      }
    });
  };

  const handleToggleActive = (type: VehicleTypeRow) => {
    startTransition(async () => {
      await updateVehicleType(type.id, { active: !type.active });
      refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search vehicle types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setShowCreate((value) => !value)}>
          <Plus className="mr-1 h-4 w-4" />
          Create Vehicle Type
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">New Vehicle Type</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="SUV" />
            </div>
            <div>
              <Label className="mb-1.5 block">Icon (optional)</Label>
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="car-suv" />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sport utility vehicles"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4">
        {filtered.map((type) => (
          <div
            key={type.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{type.name}</h3>
                <Badge className={type.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}>
                  {type.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {type.description && (
                <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                {type._count.templateFields} template fields · {type._count.vehicles} vehicles
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/vehicle-types/${type.id}`}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit Template
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleToggleActive(type)} disabled={isPending}>
                {type.active ? "Disable" : "Enable"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(type)} disabled={isPending}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete vehicle type?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This cannot be undone if vehicles still use this type.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
