import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const IMAGE_MIME_TO_EXT = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_ZIP_SIZE = 100 * 1024 * 1024;

export type SavedImageFile = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

function mimeFromExtension(ext: string): string | null {
  const normalized = ext.toLowerCase().replace(/^\./, "");
  for (const [mime, mapped] of IMAGE_MIME_TO_EXT.entries()) {
    if (mapped === normalized) return mime;
  }
  return null;
}

export function isImageFilename(filename: string): boolean {
  const ext = path.extname(filename);
  return mimeFromExtension(ext) != null;
}

export function isImageMimeType(mimeType: string): boolean {
  return IMAGE_MIME_TO_EXT.has(mimeType.toLowerCase());
}

export async function saveImageBuffer(
  buffer: Buffer,
  options: {
    originalName: string;
    mimeType?: string;
    folder?: "vehicles" | "media";
  }
): Promise<SavedImageFile> {
  const extFromName = path.extname(options.originalName);
  const mimeType =
    options.mimeType && isImageMimeType(options.mimeType)
      ? options.mimeType.toLowerCase()
      : mimeFromExtension(extFromName);

  if (!mimeType) {
    throw new Error(`Unsupported image type: ${options.originalName}`);
  }

  if (buffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error(`${options.originalName} exceeds 5MB limit`);
  }

  const folder = options.folder ?? "media";
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });

  const ext = IMAGE_MIME_TO_EXT.get(mimeType)!;
  const filename = `${randomUUID()}.${ext}`;
  const absolutePath = path.join(uploadDir, filename);
  await writeFile(absolutePath, buffer);

  return {
    url: `/uploads/${folder}/${filename}`,
    filename,
    mimeType,
    size: buffer.byteLength,
  };
}

export async function deleteLocalImage(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const relative = url.replace(/^\/+/, "");
  const absolutePath = path.join(process.cwd(), "public", relative);
  try {
    await unlink(absolutePath);
  } catch {
    // File may already be removed.
  }
}
