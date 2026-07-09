"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Archive, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteMediaAsset } from "@/lib/admin/media-actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { MediaAssetRow } from "@/lib/admin/media-actions";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaBulkUploadPanel({
  initialAssets,
}: {
  initialAssets: MediaAssetRow[];
}) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState(initialAssets);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const uploadFormData = async (formData: FormData) => {
    setUploading(true);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.assets?.length) {
        setAssets((current) => [...data.assets, ...current]);
      }
      router.refresh();
      toast({
        type: "success",
        message: `Imported ${data.imported} image${data.imported === 1 ? "" : "s"}${
          data.skipped ? ` (${data.skipped} skipped)` : ""
        }.`,
      });
    } catch (error) {
      toast({
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name)
    );
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    await uploadFormData(formData);
  };

  const handleZipFile = async (file: File) => {
    const formData = new FormData();
    formData.append("zip", file);
    await uploadFormData(formData);
  };

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);

      const zip = Array.from(event.dataTransfer.files).find((file) =>
        file.name.toLowerCase().endsWith(".zip")
      );
      if (zip) {
        await handleZipFile(zip);
        return;
      }

      await handleImageFiles(event.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteMediaAsset(id);
        setAssets((current) => current.filter((asset) => asset.id !== id));
        toast({ type: "success", message: "Image removed from library." });
      } catch (error) {
        toast({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to delete image",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void handleImageFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleZipFile(file);
            event.target.value = "";
          }}
        />

        {uploading ? (
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
        ) : (
          <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        )}

        <p className="font-medium">
          {uploading ? "Importing images..." : "Drop a ZIP archive or image files here"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          JPG, PNG, WebP, GIF — up to 5MB each. ZIP up to 100MB. Images are extracted and saved to
          your shared library for sale and rental listings.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon className="h-4 w-4" />
            Upload images
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => zipInputRef.current?.click()}
          >
            <Archive className="h-4 w-4" />
            Upload ZIP
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Image library</h3>
            <p className="text-sm text-muted-foreground">
              {assets.length} image{assets.length === 1 ? "" : "s"} available when adding sale or
              rental vehicles.
            </p>
          </div>
        </div>

        {assets.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No library images yet. Upload a ZIP of stock photos or individual image files above.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group overflow-hidden rounded-lg border border-border bg-card"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    src={asset.url}
                    alt={asset.originalName}
                    fill
                    className="object-cover"
                    unoptimized={asset.url.startsWith("/uploads/")}
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(asset.id)}
                    disabled={isPending}
                    className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Delete ${asset.originalName}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
                <div className="space-y-0.5 p-2">
                  <p className="truncate text-xs font-medium" title={asset.originalName}>
                    {asset.originalName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{formatFileSize(asset.size)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
