import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";

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

/** pdf-lib only accepts PNG/JPEG — normalize signature uploads to PNG. */
async function bufferAsPng(buffer: Buffer): Promise<Buffer> {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return buffer;
  }
  const out = await sharp(buffer).png().toBuffer();
  return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
}

/** Persist a data URL (e.g. signature canvas) under public/uploads. */
export async function saveDataUrlUpload(
  dataUrl: string,
  folder: "signatures" | "licences" | "damage" | "agreements"
): Promise<string> {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid data URL");

  const mime = match[1];
  let buffer: Buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("File too large (max 8MB)");
  }

  let ext = extensionFromMime(mime);
  // Typed office signatures are SVG; canvas pads may send other formats.
  // Always store signatures as PNG so agreement PDF embedding never fails.
  if (folder === "signatures") {
    buffer = await bufferAsPng(buffer);
    ext = "png";
  }

  const dir = path.join(UPLOAD_ROOT, folder);
  await ensureDir(dir);
  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
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
