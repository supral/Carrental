import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/admin/permissions";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import MediaBulkUploadPanel from "@/components/admin/MediaBulkUploadPanel";
import { getMediaLibrary } from "@/lib/admin/media-actions";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const canManageMedia =
    hasPermission(session.user.role, "vehicles:manage") ||
    hasPermission(session.user.role, "content:manage");

  if (!canManageMedia) redirect("/admin");

  const assets = await getMediaLibrary();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Media" }]} />
      <h1 className="text-2xl font-bold mb-2">Media Library</h1>
      <p className="text-muted-foreground mb-6">
        Bulk upload ZIP archives or image files, then reuse them on sale and rental vehicle forms.
      </p>
      <div className="max-w-5xl">
        <MediaBulkUploadPanel initialAssets={assets} />
      </div>
    </div>
  );
}
