import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { importImageFiles, importZipBuffer } from "@/lib/admin/media-library";
import { MAX_ZIP_SIZE } from "@/lib/uploads/image-storage";

const MAX_FILES_PER_REQUEST = 50;

async function authorize() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (
    !hasPermission(session.user.role, "vehicles:manage") &&
    !hasPermission(session.user.role, "content:manage")
  ) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: session.user.id };
}

export async function POST(request: Request) {
  const authResult = await authorize();
  if ("error" in authResult) return authResult.error;

  const formData = await request.formData();
  const zipFile = formData.get("zip");
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  try {
    if (zipFile instanceof File && zipFile.size > 0) {
      if (!zipFile.name.toLowerCase().endsWith(".zip")) {
        return Response.json({ error: "Only .zip archives are supported." }, { status: 400 });
      }
      if (zipFile.size > MAX_ZIP_SIZE) {
        return Response.json({ error: "ZIP file exceeds 100MB limit." }, { status: 400 });
      }

      const buffer = Buffer.from(await zipFile.arrayBuffer());
      const result = await importZipBuffer(buffer, authResult.userId);
      return Response.json({
        imported: result.imported.length,
        skipped: result.skipped.length,
        assets: result.imported,
        skippedFiles: result.skipped.slice(0, 20),
      });
    }

    if (files.length === 0) {
      return Response.json({ error: "No files provided." }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return Response.json(
        { error: `Upload at most ${MAX_FILES_PER_REQUEST} images per request.` },
        { status: 400 }
      );
    }

    const payloads = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type,
      }))
    );

    const result = await importImageFiles(payloads, authResult.userId);
    return Response.json({
      imported: result.imported.length,
      skipped: result.skipped.length,
      assets: result.imported,
      skippedFiles: result.skipped.slice(0, 20),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const authResult = await authorize();
  if ("error" in authResult) return authResult.error;

  const { listMediaAssets } = await import("@/lib/admin/media-library");
  const assets = await listMediaAssets();
  return Response.json({ assets });
}
