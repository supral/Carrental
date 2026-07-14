"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Bell, Search, Sun, Moon, LogOut, User, CalendarPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { Role } from "@prisma/client";

interface AdminHeaderProps {
  user: { name: string; email: string; role: Role };
  notificationCount?: number;
}

export default function AdminHeader({ user, notificationCount = 0 }: AdminHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/95 backdrop-blur px-6">
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search admin..." className="bg-muted/50 pl-9" />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <Button asChild className="hidden sm:inline-flex">
          <Link href="/admin/bookings/new">
            <CalendarPlus className="mr-1.5 h-4 w-4" />
            Rental Booking
          </Link>
        </Button>
        <Button asChild variant="default" size="icon" className="sm:hidden" aria-label="Rental Booking">
          <Link href="/admin/bookings/new">
            <CalendarPlus className="h-5 w-5" />
          </Link>
        </Button>

        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/admin/notifications" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {notificationCount}
              </span>
            )}
          </Link>
        </Button>

        <div className="ml-2 hidden items-center gap-3 border-l border-border pl-4 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium leading-none">{user.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
