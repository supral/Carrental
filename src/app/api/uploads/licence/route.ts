import { saveBinaryUpload } from "@/lib/uploads/rental-file-storage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json({ error: "Upload a JPG, PNG, WEBP, or PDF file" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "File exceeds 5MB limit" }, { status: 400 });
    }

    const ext = ALLOWED_TYPES.get(file.type)!;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await saveBinaryUpload(buffer, file.type, "licences", ext);

    return Response.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
