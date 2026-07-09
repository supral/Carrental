import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import NotificationCard from "@/components/admin/NotificationCard";
import { dismissReadNotificationsAction } from "@/lib/admin/notification-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
  });

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Notifications" }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You're all caught up"}
          </p>
        </div>
        {notifications.some((notification) => notification.read) && (
          <form action={dismissReadNotificationsAction}>
            <Button type="submit" variant="outline" size="sm">
              Clear read notifications
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            id={notification.id}
            title={notification.title}
            message={notification.message}
            createdAt={notification.createdAt}
            read={notification.read}
            link={notification.link}
          />
        ))}
        {notifications.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No notifications.</p>
        )}
      </div>
    </div>
  );
}
