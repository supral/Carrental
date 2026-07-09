import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/admin/permissions";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminFeatureNotice from "@/components/admin/AdminFeatureNotice";
import { getMediaLibrary } from "@/lib/admin/media-actions";
import MediaBulkUploadPanel from "@/components/admin/MediaBulkUploadPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const canManageSettings = hasPermission(session.user.role, "settings:manage");
  const canManageMedia =
    hasPermission(session.user.role, "vehicles:manage") ||
    hasPermission(session.user.role, "content:manage");

  if (!canManageSettings && !canManageMedia) redirect("/admin");

  const [settings, mediaAssets] = await Promise.all([
    canManageSettings
      ? prisma.siteSetting.findMany()
      : Promise.resolve([]),
    canManageMedia ? getMediaLibrary() : Promise.resolve([]),
  ]);

  const branding = settings.find((s) => s.key === "branding")?.value as Record<string, string> | undefined;

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Settings" }]} />
      <h1 className="text-2xl font-bold mb-2">Site Settings</h1>
      <p className="text-muted-foreground mb-6">
        Configure site options and manage a shared image library for rental listings.
      </p>

      {canManageMedia && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6 max-w-5xl">
          <h2 className="text-lg font-semibold mb-1">Image library</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload a ZIP of stock photos or multiple image files. Extracted images are saved to a
            shared library you can reuse when creating rental vehicles.
          </p>
          <MediaBulkUploadPanel initialAssets={mediaAssets} />
        </div>
      )}

      {canManageSettings && (
        <>
          <AdminFeatureNotice
            description="Branding, SEO, and notification preferences are read-only in this release and will be editable in a future update."
          />

          <div className="grid gap-6 max-w-2xl">
            {[
              { title: "Branding", fields: [
                { id: "siteName", label: "Site Name", default: branding?.siteName || "Everest Car Rental" },
                { id: "tagline", label: "Tagline", default: branding?.tagline || "Best Car Dealership in Darwin" },
                { id: "primaryColor", label: "Primary Color", default: branding?.primaryColor || "#dc2626" },
              ]},
              { title: "SEO", fields: [
                { id: "metaTitle", label: "Meta Title", default: "Everest Car Rental – Car Rental in Darwin" },
                { id: "metaDescription", label: "Meta Description", default: "Quality used cars in Darwin, NT" },
              ]},
              { title: "Email Templates", fields: [
                { id: "leadNotification", label: "Lead Notification Email", default: "New enquiry received" },
              ]},
              { title: "Notifications", fields: [
                { id: "emailAlerts", label: "Email Alerts", default: "enabled" },
              ]},
            ].map((section) => (
              <div key={section.title} className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
                <div className="space-y-4">
                  {section.fields.map((field) => (
                    <div key={field.id}>
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <Input id={field.id} defaultValue={field.default} className="mt-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button className="w-fit" disabled>
              Save Settings
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
