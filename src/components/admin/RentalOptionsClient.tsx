"use client";

import { useState, useTransition } from "react";
import { RentalOptionCategory, RentalOptionPriceType } from "@prisma/client";
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
import { formatPrice } from "@/lib/utils";
import {
  createRentalOption,
  deleteRentalOption,
  listRentalOptions,
  toggleRentalOptionActive,
  updateRentalOption,
} from "@/lib/admin/rental-option-actions";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

type RentalOptionRow = Awaited<ReturnType<typeof listRentalOptions>>[number];

const CATEGORY_OPTIONS: { value: RentalOptionCategory; label: string }[] = [
  { value: "INSURANCE", label: "Insurance" },
  { value: "EXTRA", label: "Extra" },
  { value: "PROTECTION", label: "Protection" },
  { value: "ACCESSORY", label: "Accessory" },
];

interface RentalOptionsClientProps {
  initialOptions: RentalOptionRow[];
}

export default function RentalOptionsClient({ initialOptions }: RentalOptionsClientProps) {
  const { toast } = useAdminToast();
  const [options, setOptions] = useState(initialOptions);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "INSURANCE" as RentalOptionCategory,
    price: "0",
    description: "",
    priceType: "PER_DAY" as RentalOptionPriceType,
    supportsQuantity: false,
    maxQuantity: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<RentalOptionRow | null>(null);

  const filtered = options.filter((option) => {
    const matchesSearch = option.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || option.category === category;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setForm({
      name: "",
      category: "INSURANCE",
      price: "0",
      description: "",
      priceType: "PER_DAY",
      supportsQuantity: false,
      maxQuantity: "",
    });
    setEditingId(null);
    setShowCreate(false);
  };

  const refresh = () => {
    startTransition(async () => {
      const rows = await listRentalOptions({
        search: search || undefined,
        category: category === "all" ? undefined : (category as RentalOptionCategory),
      });
      setOptions(rows);
    });
  };

  const handleSave = () => {
    setError("");
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price < 0) {
      setError("Name and a valid price are required.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name: form.name,
          category: form.category,
          price,
          description: form.description || undefined,
          priceType: form.priceType,
          supportsQuantity: form.supportsQuantity,
          maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : undefined,
        };

        if (editingId) {
          await updateRentalOption(editingId, payload);
        } else {
          await createRentalOption(payload);
        }

        resetForm();
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save rental option");
      }
    });
  };

  const handleEdit = (option: RentalOptionRow) => {
    setEditingId(option.id);
    setShowCreate(true);
    setForm({
      name: option.name,
      category: option.category,
      price: String(option.price),
      description: option.description ?? "",
      priceType: option.priceType,
      supportsQuantity: option.supportsQuantity,
      maxQuantity: option.maxQuantity ? String(option.maxQuantity) : "",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteRentalOption(deleteTarget.id);
        setDeleteTarget(null);
        refresh();
        toast({ type: "success", message: "Rental option deleted." });
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to delete rental option",
        });
      }
    });
  };

  const handleToggle = (id: string, active: boolean) => {
    startTransition(async () => {
      await toggleRentalOptionActive(id, active);
      refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search options..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORY_OPTIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Create Option
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? "Edit Rental Option" : "New Rental Option"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block">Category *</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm({ ...form, category: value as RentalOptionCategory })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Price (AUD) *</Label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Price Type</Label>
              <Select
                value={form.priceType}
                onValueChange={(value) =>
                  setForm({ ...form, priceType: value as RentalOptionPriceType })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_DAY">Per day</SelectItem>
                  <SelectItem value="PER_RENTAL">Per rental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.supportsQuantity}
                onCheckedChange={(checked) =>
                  setForm({ ...form, supportsQuantity: checked === true })
                }
              />
              Supports quantity
            </label>
            {form.supportsQuantity && (
              <div>
                <Label className="mb-1.5 block">Max quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxQuantity}
                  onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} disabled={isPending}>{editingId ? "Update" : "Create"}</Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4">
        {filtered.map((option) => (
          <div
            key={option.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-lg">{option.name}</h3>
                <Badge variant="outline">
                  {CATEGORY_OPTIONS.find((item) => item.value === option.category)?.label}
                </Badge>
                <Badge className={option.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}>
                  {option.active ? "Active" : "Disabled"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPrice(option.price)}
                {option.priceType === "PER_DAY" ? "/day" : "/rental"}
              </p>
              {option.description && (
                <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(option)}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggle(option.id, !option.active)}
                disabled={isPending}
              >
                {option.active ? "Disable" : "Enable"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(option)} disabled={isPending}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete rental option?"
        description={
          deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : undefined
        }
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
