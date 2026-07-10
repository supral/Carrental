"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Link2, Loader2, Star, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import MediaLibraryPicker from "@/components/admin/MediaLibraryPicker";
import FleetStockImagePicker from "@/components/admin/FleetStockImagePicker";

interface VehicleImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  error?: string;
}

async function uploadFiles(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Upload failed");
  }

  return data.urls as string[];
}

export default function VehicleImageUpload({
  images,
  onChange,
  onUploadingChange,
  error,
}: VehicleImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [fleetBrowseOpen, setFleetBrowseOpen] = useState(false);

  const setUploadState = (value: boolean) => {
    setUploading(value);
    onUploadingChange?.(value);
  };

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
      if (files.length === 0) return;

      setUploadError("");
      setUploadState(true);
      try {
        const urls = await uploadFiles(files);
        onChange([...images, ...urls]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadState(false);
      }
    },
    [images, onChange]
  );

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange([...images, url]);
    setUrlInput("");
    setUploadError("");
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveCover = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
        ) : (
          <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        )}
        <p className="font-medium">
          {uploading ? "Uploading images..." : "Drag and drop photos from your device"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, or WebP — up to 5MB each</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => setFleetBrowseOpen(true)}
          >
            <Images className="h-4 w-4" />
            Browse
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            Upload from device
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => setLibraryOpen(true)}
          >
            Image library
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="image-url-input">Or add image URL</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="image-url-input"
            placeholder="https://example.com/photo.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addUrl}>
            <Link2 className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {images.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-medium">
            {images.length} image{images.length === 1 ? "" : "s"} — first image is the cover photo
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted"
              >
                <Image
                  src={url}
                  alt={`Vehicle image ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized={url.startsWith("/uploads/") || url.startsWith("/images/")}
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <Star className="h-3 w-3" />
                    Cover
                  </span>
                )}
                <div className="absolute inset-0 flex items-start justify-end gap-1 bg-black/0 p-2 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => moveCover(index)}
                      className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-900"
                    >
                      Set cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="rounded-md bg-white/90 p-1 text-gray-900"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(error || uploadError) && (
        <p className="text-sm text-red-600">{error || uploadError}</p>
      )}

      <FleetStockImagePicker
        open={fleetBrowseOpen}
        onOpenChange={setFleetBrowseOpen}
        selectedUrls={images}
        onSelect={(urls) => {
          onChange([...images, ...urls]);
          setUploadError("");
        }}
      />

      <MediaLibraryPicker
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        selectedUrls={images}
        onSelect={(urls) => {
          onChange([...images, ...urls]);
          setUploadError("");
        }}
      />
    </div>
  );
}
