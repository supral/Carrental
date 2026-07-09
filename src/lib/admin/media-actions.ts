"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import { deleteLocalImage } from "@/lib/uploads/image-storage";
import { listMediaAssets } from "@/lib/admin/media-library";

async function requireMediaAccess() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (
    !hasPermission(session.user.role, "vehicles:manage") &&
    !hasPermission(session.user.role, "content:manage")
  ) {
    throw new Error("Forbidden");
  }
  return session.user;
}

export type MediaAssetRow = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};

export async function getMediaLibrary(): Promise<MediaAssetRow[]> {
  await requireMediaAccess();
  return listMediaAssets();
}

export async function deleteMediaAsset(id: string) {
  await requireMediaAccess();

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new Error("Image not found");

  await prisma.mediaAsset.delete({ where: { id } });
  await deleteLocalImage(asset.url);

  revalidatePath("/admin/settings");
  revalidatePath("/admin/media");
}
