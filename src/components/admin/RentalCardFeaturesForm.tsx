"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SUGGESTIONS = ["A/C", "5 passengers", "2 luggage", "Automatic"];

interface RentalCardFeaturesFormProps {
  features: string[];
  onChange: (features: string[]) => void;
}

export default function RentalCardFeaturesForm({
  features,
  onChange,
}: RentalCardFeaturesFormProps) {
  const updateAt = (index: number, value: string) => {
    onChange(features.map((feature, i) => (i === index ? value : feature)));
  };

  const removeAt = (index: number) => {
    onChange(features.filter((_, i) => i !== index));
  };

  const addFeature = (value = "") => {
    onChange([...features, value]);
  };

  const addSuggestion = (suggestion: string) => {
    if (features.some((feature) => feature.toLowerCase() === suggestion.toLowerCase())) {
      return;
    }
    onChange([...features, suggestion]);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-1.5 block">Card features</Label>
        <p className="text-sm text-muted-foreground">
          Shown on the public rental card (up to four recommended). Add these once on the vehicle
          type — they appear automatically on listings.
        </p>
      </div>

      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={feature}
              onChange={(event) => updateAt(index, event.target.value)}
              placeholder="e.g. 5 passengers"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeAt(index)}
              aria-label={`Remove feature ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addFeature()}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add feature
        </Button>
        {SUGGESTIONS.filter(
          (suggestion) =>
            !features.some((feature) => feature.toLowerCase() === suggestion.toLowerCase())
        ).map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addSuggestion(suggestion)}
          >
            + {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
