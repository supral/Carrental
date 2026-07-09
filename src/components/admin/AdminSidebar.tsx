"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Car, FileText,
  BarChart3, Settings, Bell, Image, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Role } from "@prisma/client";
import { hasPermission, AdminPermission } from "@/lib/admin/permissions";
import AdminBrand from "@/components/admin/AdminBrand";

const navItems: { href: string; label: string; icon: React.ElementType; permission?: AdminPermission }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/admin/vehicles", label: "Rental Fleet", icon: Car, permission: "vehicles:view" },
  { href: "/admin/rental-options", label: "Rental Options", icon: Package, permission: "vehicles:view" },
  { href: "/admin/bookings", label: "Rental Bookings", icon: FileText, permission: "vehicles:view" },
  { href: "/admin/media", label: "Media", icon: Image, permission: "content:manage" },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, permission: "reports:view" },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, permission: "notifications:view" },
  { href: "/admin/settings", label: "Settings", icon: Settings, permission: "settings:view" },
];

export default function AdminSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filtered = navItems.filter((item) => {
    if (!item.permission) return true;
    if (item.href === "/admin/settings" && hasPermission(role, "vehicles:manage")) return true;
    return hasPermission(role, item.permission);
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-[72px]" : "w-72"
      )}
    >
      <AdminBrand collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filtered.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-border p-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Website
          </Link>
        </div>
      )}
    </aside>
  );
}
