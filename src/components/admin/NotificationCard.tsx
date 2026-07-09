"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  markNotificationReadAction,
  openNotification,
} from "@/lib/admin/notification-actions";

type NotificationCardProps = {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  link: string | null;
};

export default function NotificationCard({
  id,
  title,
  message,
  createdAt,
  read,
  link,
}: NotificationCardProps) {
  const cardClassName = cn(
    "rounded-xl border border-border p-4 transition-colors",
    !read ? "bg-primary/5 border-primary/20" : "bg-card opacity-80",
    link && "hover:bg-muted/40 cursor-pointer"
  );

  const content = (
    <>
      <p className="font-medium pr-20">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
      <p className="text-xs text-muted-foreground mt-2">
        {format(new Date(createdAt), "dd MMM yyyy HH:mm")}
        {read ? " · Read" : " · Unread"}
        {link ? " · Click to open" : ""}
      </p>
    </>
  );

  return (
    <div className="relative">
      {link ? (
        <form action={openNotification.bind(null, id)}>
          <button type="submit" className={cn(cardClassName, "w-full text-left")}>
            {content}
          </button>
        </form>
      ) : (
        <div className={cardClassName}>{content}</div>
      )}

      {!read && (
        <form
          action={markNotificationReadAction.bind(null, id)}
          className="absolute top-4 right-4 z-10"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            Mark read
          </button>
        </form>
      )}
    </div>
  );
}
