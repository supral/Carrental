import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { put } from "@vercel/blob";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
/** Inline data URLs are a Vercel fallback when Blob is not configured — keep small. */
const MAX_INLINE_BYTES = 4 * 1024 * 1024;

type UploadFolder = "signatures" | "licences" | "damage" | "agreements";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function extensionFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("svg")) return "svg";
  return "jpg";
}

function toDataUrl(buffer: Buffer, mime: string): string {
  if (buffer.length > MAX_INLINE_BYTES) {
    throw new Error(
      "File too large for inline storage. Create a Vercel Blob store and set BLOB_READ_WRITE_TOKEN."
    );
  }
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/** pdf-lib only accepts PNG/JPEG — normalize signature uploads to PNG. */
async function bufferAsPng(buffer: Buffer): Promise<Buffer> {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return buffer;
  }
  const out = await sharp(buffer).png().toBuffer();
  return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

async function persistUpload(
  buffer: Buffer,
  mime: string,
  folder: UploadFolder,
  ext: string
): Promise<string> {
  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`uploads/${folder}/${filename}`, buffer, {
        access: "public",
        contentType: mime,
        addRandomSuffix: false,
      });
      return blob.url;
    } catch (error) {
      console.error("[rental-file-storage] Blob upload failed, using inline fallback:", error);
    }
  }

  if (process.env.VERCEL) {
    return toDataUrl(buffer, mime);
  }

  const dir = path.join(UPLOAD_ROOT, folder);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

/** Persist a data URL (e.g. signature canvas) under public/uploads or Vercel Blob. */
export async function saveDataUrlUpload(
  dataUrl: string,
  folder: UploadFolder
): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");

  let mime = match[1];
  let buffer: Buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("File too large (max 8MB)");
  }

  let ext = extensionFromMime(mime);
  if (folder === "signatures") {
    buffer = await bufferAsPng(buffer);
    ext = "png";
    mime = "image/png";
  }

  return persistUpload(buffer, mime, folder, ext);
}

export async function saveBinaryUpload(
  buffer: Buffer,
  mime: string,
  folder: UploadFolder,
  preferredExt?: string
): Promise<string> {
  if (buffer.length > 12 * 1024 * 1024) {
    throw new Error("File too large (max 12MB)");
  }
  const ext = preferredExt ?? extensionFromMime(mime);
  return persistUpload(buffer, mime, folder, ext);
}

export function publicUrlToAbsolutePath(publicUrl: string): string {
  const cleaned = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  return path.join(process.cwd(), "public", cleaned);
}

/** Read bytes from a local path, remote Blob URL, or inline data URL. */
export async function readUploadBytes(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(url);
    if (!match) throw new Error("Invalid data URL");
    return Buffer.from(match[2], "base64");
  }

  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to read upload (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  const abs = publicUrlToAbsolutePath(url);
  return Buffer.from(await fs.readFile(abs));
}
