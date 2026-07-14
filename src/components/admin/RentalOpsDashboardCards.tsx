import Link from "next/link";

type OpsStats = {
  currentlyRented: number;
  dueToday: number;
  lateReturns: number;
  pendingAgreements: number;
  pendingPayments: number;
  completedRentals: number;
};

const CARDS: Array<{ key: keyof OpsStats; label: string; href: string }> = [
  { key: "currentlyRented", label: "Vehicles Currently Rented", href: "/admin/bookings" },
  { key: "dueToday", label: "Vehicles Due Today", href: "/admin/bookings" },
  { key: "lateReturns", label: "Late Returns", href: "/admin/bookings" },
  { key: "pendingAgreements", label: "Pending Agreements", href: "/admin/bookings" },
  { key: "pendingPayments", label: "Pending Payments", href: "/admin/bookings" },
  { key: "completedRentals", label: "Completed Rentals", href: "/admin/bookings" },
];

export default function RentalOpsDashboardCards({ stats }: { stats: OpsStats }) {
  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {CARDS.map((card) => (
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
  );
}
