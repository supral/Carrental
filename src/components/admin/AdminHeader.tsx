"use client";

import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Bell, Search, Sun, Moon, LogOut, User } from "lucide-react";
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
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search admin..." className="pl-9 bg-muted/50" />
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

        <Button variant="ghost" size="icon" className="relative" asChild>
          <a href="/admin/notifications" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                {notificationCount}
              </span>
            )}
          </a>
        </Button>

        <div className="hidden sm:flex items-center gap-3 ml-2 pl-4 border-l border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium leading-none">{user.name}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/admin/login" })} aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
