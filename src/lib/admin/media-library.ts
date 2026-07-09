import "server-only";

import AdmZip from "adm-zip";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  isImageFilename,
  isImageMimeType,
  saveImageBuffer,
  type SavedImageFile,
} from "@/lib/uploads/image-storage";

export type MediaAssetRow = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};

export async function listMediaAssets(limit = 120): Promise<MediaAssetRow[]> {
  return prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      url: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  });
}

async function persistMediaAsset(
  saved: SavedImageFile,
  originalName: string,
  uploadedById?: string | null
) {
  return prisma.mediaAsset.create({
    data: {
      url: saved.url,
      filename: saved.filename,
      originalName,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedById: uploadedById ?? null,
    },
    select: {
      id: true,
      url: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  });
}

export async function importImageFiles(
  files: { name: string; buffer: Buffer; mimeType?: string }[],
  uploadedById?: string | null
) {
  const imported: MediaAssetRow[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (!isImageFilename(file.name) && !(file.mimeType && isImageMimeType(file.mimeType))) {
      skipped.push(file.name);
      continue;
    }

    try {
      const saved = await saveImageBuffer(file.buffer, {
        originalName: file.name,
        mimeType: file.mimeType,
        folder: "media",
      });
      const row = await persistMediaAsset(saved, path.basename(file.name), uploadedById);
      imported.push(row);
    } catch (error) {
      skipped.push(
        `${file.name}${error instanceof Error ? `: ${error.message}` : ""}`
      );
    }
  }

  return { imported, skipped };
}

export async function importZipBuffer(buffer: Buffer, uploadedById?: string | null) {
  const zip = new AdmZip(buffer);
  const entries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && isImageFilename(entry.entryName));

  const files = entries.map((entry) => ({
    name: path.basename(entry.entryName),
    buffer: entry.getData(),
    mimeType: undefined as string | undefined,
  }));

  return importImageFiles(files, uploadedById);
}
