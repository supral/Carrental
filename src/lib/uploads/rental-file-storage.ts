import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

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

/** Persist a data URL (e.g. signature canvas) under public/uploads. */
export async function saveDataUrlUpload(
  dataUrl: string,
  folder: "signatures" | "licences" | "damage" | "agreements"
): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");

  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("File too large (max 8MB)");
  }

  const dir = path.join(UPLOAD_ROOT, folder);
  await ensureDir(dir);
  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFromMime(mime)}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

export async function saveBinaryUpload(
  buffer: Buffer,
  mime: string,
  folder: "signatures" | "licences" | "damage" | "agreements",
  preferredExt?: string
): Promise<string> {
  if (buffer.length > 12 * 1024 * 1024) {
    throw new Error("File too large (max 12MB)");
  }
  const dir = path.join(UPLOAD_ROOT, folder);
  await ensureDir(dir);
  const ext = preferredExt ?? extensionFromMime(mime);
  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

export function publicUrlToAbsolutePath(publicUrl: string): string {
  const cleaned = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
  return path.join(process.cwd(), "public", cleaned);
}
