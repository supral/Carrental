"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  createDetailSectionId,
  getDefaultDetailSections,
  type VehicleDetailSection,
  type VehicleDetailsDocument,
} from "@/lib/vehicles/vehicle-details";

interface VehicleDetailsEditorProps {
  value: VehicleDetailsDocument;
  onChange: (value: VehicleDetailsDocument) => void;
  bodyType: string;
  listingPurpose: "sale" | "rental";
}

const textareaClass =
  "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function VehicleDetailsEditor({
  value,
  onChange,
  bodyType,
  listingPurpose,
}: VehicleDetailsEditorProps) {
  const sections = value.sections;

  const updateSections = (next: VehicleDetailSection[]) => {
    onChange({
      sections: next.map((section, index) => ({ ...section, order: index })),
    });
  };

  const addSection = () => {
    updateSections([
      ...sections,
      {
        id: createDetailSectionId(),
        title: "",
        content: "",
        order: sections.length,
      },
    ]);
  };

  const applyTemplate = () => {
    onChange({ sections: getDefaultDetailSections(bodyType, listingPurpose) });
  };

  const updateSection = (id: string, patch: Partial<VehicleDetailSection>) => {
    updateSections(sections.map((section) => (section.id === id ? { ...section, ...patch } : section)));
  };

  const removeSection = (id: string) => {
    updateSections(sections.filter((section) => section.id !== id));
  };

  const moveSection = (id: string, direction: -1 | 1) => {
    const index = sections.findIndex((section) => section.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;

    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    updateSections(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Add detail sections customers can open from the vehicle page. Templates are suggested for{" "}
          <strong>{bodyType || "this body type"}</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={applyTemplate}>
            Use {listingPurpose === "rental" ? "Rental" : "Sale"} Template
          </Button>
          <Button type="button" size="sm" onClick={addSection}>
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
        </div>
      </div>

      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No detail sections yet. Use a template or add sections manually.
        </p>
      )}

      {sections.map((section, index) => (
        <div key={section.id} className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Section {index + 1}</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => moveSection(section.id, -1)}
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={index === sections.length - 1}
                onClick={() => moveSection(section.id, 1)}
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSection(section.id)}
                aria-label="Remove section"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                className="mt-1.5"
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                placeholder="e.g. Features & Equipment"
              />
            </div>
            <div>
              <Label>Content</Label>
              <textarea
                className={`${textareaClass} mt-1.5`}
                rows={5}
                value={section.content}
                onChange={(e) => updateSection(section.id, { content: e.target.value })}
                placeholder="Write the detail content customers will see..."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
