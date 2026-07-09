"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Ban, Plus, Trash2 } from "lucide-react";
import OfferTemplateForm, {
  type OfferTemplateFormState,
} from "@/components/admin/OfferTemplateForm";
import {
  createSeasonOfferTemplate,
  deleteSeasonOfferTemplate,
  toggleSeasonOfferTemplate,
  updateSeasonOfferTemplate,
  type SeasonOfferTemplateRow,
} from "@/lib/admin/offer-actions";
import { validateSeasonOfferTemplate } from "@/lib/vehicles/vehicle-offers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

const defaultTemplate: OfferTemplateFormState = {
  name: "",
  offerType: "Season Offer",
  offerDiscountType: "AMOUNT",
  isEnabled: true,
};

export default function AdminOffersClient({
  initialTemplates,
}: {
  initialTemplates: SeasonOfferTemplateRow[];
}) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OfferTemplateFormState>(defaultTemplate);
  const [deleteTarget, setDeleteTarget] = useState<SeasonOfferTemplateRow | null>(null);

  const resetForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(defaultTemplate);
    setError("");
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultTemplate);
    setFormOpen(true);
  };

  const openEdit = (template: SeasonOfferTemplateRow) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      offerType: template.offerType,
      offerDiscountType: template.offerDiscountType,
      offerAmount: template.offerAmount,
      offerPercent: template.offerPercent,
      offerStartDate: template.offerStartDate,
      offerEndDate: template.offerEndDate,
      isEnabled: template.isEnabled,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    setError("");
    startTransition(async () => {
      try {
        validateSeasonOfferTemplate(form);
        if (editingId) {
          await updateSeasonOfferTemplate(editingId, form);
        } else {
          await createSeasonOfferTemplate(form);
        }
        resetForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save offer");
      }
    });
  };

  const handleToggle = (id: string, isEnabled: boolean) => {
    startTransition(async () => {
      try {
        await toggleSeasonOfferTemplate(id, isEnabled);
        setTemplates((rows) =>
          rows.map((row) => (row.id === id ? { ...row, isEnabled } : row))
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update offer");
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteSeasonOfferTemplate(deleteTarget.id);
        setTemplates((rows) => rows.filter((row) => row.id !== deleteTarget.id));
        setDeleteTarget(null);
        router.refresh();
        toast({ type: "success", message: "Offer deleted." });
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to delete offer",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Create reusable offers here, then assign them to vehicles from{" "}
          <strong>Vehicle Management → Offer</strong> column.
        </p>
        {!formOpen && (
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Create Offer
          </Button>
        )}
      </div>

      {formOpen && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? "Edit Offer" : "New Offer"}
          </h2>
          <OfferTemplateForm value={form} onChange={setForm} />
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}
          <div className="mt-6 flex gap-3">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : editingId ? "Update Offer" : "Create Offer"}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && !formOpen && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {templates.length === 0 && !formOpen ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No offers created yet.</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Create your first offer
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <Badge className="bg-red-600 text-white">{template.offerType}</Badge>
                  <Badge variant="outline">{template.discountLabel} off</Badge>
                  <Badge
                    className={
                      template.isEnabled
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    {template.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>{template.vehicleCount} vehicle(s) assigned</span>
                  <span>
                    {template.offerStartDate
                      ? `Starts ${format(new Date(template.offerStartDate), "dd MMM yyyy")}`
                      : "Starts immediately"}
                  </span>
                  <span>
                    {template.offerEndDate
                      ? `Ends ${format(new Date(template.offerEndDate), "dd MMM yyyy")}`
                      : "No end date"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(template.id, !template.isEnabled)}
                  disabled={isPending}
                >
                  <Ban className="mr-1 h-4 w-4" />
                  {template.isEnabled ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(template)}
                  disabled={isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete offer?"
        description={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? It will be removed from all ${deleteTarget.vehicleCount} assigned vehicle${deleteTarget.vehicleCount === 1 ? "" : "s"}.`
            : undefined
        }
        confirmLabel="Delete offer"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
