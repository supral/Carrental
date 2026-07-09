"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Images, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LibraryAsset = {
  id: string;
  url: string;
  originalName: string;
};

interface MediaLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void;
  selectedUrls?: string[];
}

export default function MediaLibraryPicker({
  open,
  onOpenChange,
  onSelect,
  selectedUrls = [],
}: MediaLibraryPickerProps) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setPicked([]);
      setError("");
      return;
    }

    setLoading(true);
    fetch("/api/admin/media")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load library");
        }
        setAssets(data.assets ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load library");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (url: string) => {
    setPicked((current) =>
      current.includes(url) ? current.filter((item) => item !== url) : [...current, url]
    );
  };

  const handleConfirm = () => {
    const existing = new Set(selectedUrls);
    const unique = picked.filter((url) => !existing.has(url));
    onSelect(unique);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose from image library</DialogTitle>
          <DialogDescription>
            Select photos uploaded in Settings → Image library. They work for both sale and rental
            listings.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading library...
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        ) : assets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No images in the library yet. Upload a ZIP or image files under Admin → Settings.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {assets.map((asset) => {
              const isSelected = picked.includes(asset.url);
              const alreadyUsed = selectedUrls.includes(asset.url);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => !alreadyUsed && toggle(asset.url)}
                  disabled={alreadyUsed}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border text-left transition",
                    isSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
                    alreadyUsed && "opacity-50"
                  )}
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image
                      src={asset.url}
                      alt={asset.originalName}
                      fill
                      className="object-cover"
                      unoptimized={asset.url.startsWith("/uploads/")}
                    />
                    {isSelected && (
                      <span className="absolute left-2 top-2 inline-flex rounded-full bg-primary p-1 text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="truncate px-2 py-1.5 text-xs" title={asset.originalName}>
                    {asset.originalName}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={picked.length === 0}>
            Add {picked.length || ""} image{picked.length === 1 ? "" : "s"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
