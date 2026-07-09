"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { deleteAdminUser, updateAdminUserStatus } from "@/lib/admin/admin-user-actions";
import { UserStatus } from "@prisma/client";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

export type AdminStaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  phone: string | null;
  dealerName: string | null;
  lastLoginAt: Date | null;
  vehiclesCreated: number;
  auditActions: number;
  createdAt: Date;
};

export default function AdminStaffTable({ staff }: { staff: AdminStaffRow[] }) {
  const router = useRouter();
  const { toast } = useAdminToast();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AdminStaffRow | null>(null);

  const run = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteAdminUser(deleteTarget.id);
        setDeleteTarget(null);
        router.refresh();
        toast({ type: "success", message: `${deleteTarget.name} was deleted.` });
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to delete admin user",
        });
      }
    });
  };

  if (staff.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
        No admin staff found.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Activity</th>
              <th className="px-4 py-3 text-left">Last login</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((user) => (
              <tr key={user.id} className="border-b hover:bg-muted/30 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.dealerName && <p className="text-xs text-muted-foreground mt-1">Dealer: {user.dealerName}</p>}
                </td>
                <td className="px-4 py-3">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <p>{user.vehiclesCreated} vehicles added</p>
                  <p>{user.auditActions} audit actions</p>
                  <Link href={`/admin/audit?userId=${user.id}`} className="text-primary hover:underline">
                    View activity
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {user.lastLoginAt ? format(new Date(user.lastLoginAt), "dd MMM yyyy, h:mm a") : "Never"}
                </td>
                <td className="px-4 py-3">
                  <Badge className={user.status === UserStatus.ACTIVE ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {user.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {user.role !== "SUPER_ADMIN" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/admins/${user.id}/edit`}>Edit</Link>
                      </Button>
                      {user.status === UserStatus.ACTIVE ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => run(() => updateAdminUserStatus(user.id, UserStatus.BANNED))}
                        >
                          Ban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => run(() => updateAdminUserStatus(user.id, UserStatus.ACTIVE))}
                        >
                          Activate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => setDeleteTarget(user)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Protected account</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete admin user?"
        description={
          deleteTarget ? `Delete ${deleteTarget.name}? This cannot be undone.` : undefined
        }
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
