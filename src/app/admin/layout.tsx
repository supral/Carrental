import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminProviders from "@/components/admin/AdminProviders";
import { prisma } from "@/lib/prisma";
import { processCompletedViewingFollowUps } from "@/lib/sales/viewing-follow-up";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return <>{children}</>;

  await processCompletedViewingFollowUps().catch(() => {});

  const notificationCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  }).catch(() => 0);

  return (
    <AdminProviders>
      <div className="min-h-screen bg-background">
        <AdminSidebar role={session.user.role} />
        <div className="lg:pl-72 transition-all duration-300">
          <AdminHeader user={session.user} notificationCount={notificationCount} />
          <div className="p-6">{children}</div>
        </div>
      </div>
    </AdminProviders>
  );
}
