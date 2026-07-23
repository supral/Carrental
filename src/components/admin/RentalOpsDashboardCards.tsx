import Link from "next/link";
import { format } from "date-fns";
import { ArrowDownToLine, ArrowUpFromLine, Phone, Mail, UserRound } from "lucide-react";
import type { OpsDashboardBookingRow, OpsDashboardStats } from "@/lib/admin/rental-agreement-actions";
import { formatRentalBookingStatus } from "@/lib/rentals/rental-booking-status";
import { cn } from "@/lib/utils";

const SUMMARY_CARDS: Array<{
  key: keyof Pick<
    OpsDashboardStats,
    | "currentlyRented"
    | "dueToday"
    | "lateReturns"
    | "pendingAgreements"
    | "pendingPayments"
    | "completedRentals"
  >;
  label: string;
  href: string;
}> = [
  { key: "currentlyRented", label: "Vehicles Currently Rented", href: "/admin/bookings" },
  { key: "dueToday", label: "Vehicles Due Today", href: "/admin/bookings" },
  { key: "lateReturns", label: "Late Returns", href: "/admin/bookings" },
  { key: "pendingAgreements", label: "Pending Agreements", href: "/admin/bookings" },
  { key: "pendingPayments", label: "Pending Payments", href: "/admin/bookings" },
  { key: "completedRentals", label: "Completed Rentals", href: "/admin/bookings" },
];

function MovementPeriodCards({ stats }: { stats: OpsDashboardStats }) {
  const periods = [
    { label: "Today", counts: stats.movements.today },
    { label: "This week", counts: stats.movements.week },
    { label: "This month", counts: stats.movements.month },
  ] as const;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Fleet movements</h2>
          <p className="text-sm text-muted-foreground">
            Cars going out (pickups) and coming back (returns). Detailed analytics live in Reports.
          </p>
        </div>
        <Link href="/admin/reports" className="text-sm font-medium text-primary hover:underline">
          Open Reports
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {periods.map((period) => (
          <div key={period.label} className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">{period.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-700">Going out</p>
                <p className="text-2xl font-bold tabular-nums">{period.counts.leaving}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Coming in</p>
                <p className="text-2xl font-bold tabular-nums">{period.counts.coming}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CustomersTodayList({ items }: { items: OpsDashboardBookingRow[] }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Customers scheduled today</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums">
              {items.length}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Contact details for pickups and returns due today.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          No customers scheduled for today.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const when =
              item.movement === "pickup"
                ? format(new Date(item.pickupAt), "h:mm a")
                : format(new Date(item.dropoffAt), "h:mm a");
            return (
              <li key={`${item.id}-${item.movement}`}>
                <Link
                  href={`/admin/bookings/${item.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{item.customerName}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          item.movement === "pickup"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-emerald-50 text-emerald-800"
                        )}
                      >
                        {item.movement === "pickup" ? "Pickup" : "Return"}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.vehicleLabel}
                      {item.fleetLabel ? ` · ${item.fleetLabel}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {item.customerPhone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {item.customerPhone}
                        </span>
                      )}
                      {item.customerEmail && (
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.customerEmail}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm">
                    <span className="tabular-nums text-muted-foreground">{when}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {formatRentalBookingStatus(item.status)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TodayMovementList({
  title,
  description,
  icon: Icon,
  tone,
  items,
  emptyLabel,
  timeKey,
}: {
  title: string;
  description: string;
  icon: typeof ArrowUpFromLine;
  tone: "out" | "in";
  items: OpsDashboardBookingRow[];
  emptyLabel: string;
  timeKey: "pickupAt" | "dropoffAt";
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            tone === "out" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums">
              {items.length}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/bookings/${item.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.vehicleLabel}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.fleetLabel ? `${item.fleetLabel} · ` : ""}
                    {item.customerName}
                    {item.customerPhone ? ` · ${item.customerPhone}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    {format(new Date(item[timeKey]), "h:mm a")}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {formatRentalBookingStatus(item.status)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function RentalOpsDashboardCards({ stats }: { stats: OpsDashboardStats }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SUMMARY_CARDS.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40"
          >
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{stats[card.key]}</p>
          </Link>
        ))}
      </div>

      <MovementPeriodCards stats={stats} />
      <CustomersTodayList items={stats.customersToday} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TodayMovementList
          title="Leaving today"
          description="Cars scheduled for pickup — going out on rent"
          icon={ArrowUpFromLine}
          tone="out"
          items={stats.leavingToday}
          emptyLabel="No pickups scheduled for today."
          timeKey="pickupAt"
        />
        <TodayMovementList
          title="Coming today"
          description="Cars scheduled for return — coming back to the yard"
          icon={ArrowDownToLine}
          tone="in"
          items={stats.comingToday}
          emptyLabel="No returns scheduled for today."
          timeKey="dropoffAt"
        />
      </div>
    </div>
  );
}
