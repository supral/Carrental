"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Car,
  CheckCircle,
  Clock,
  DollarSign,
  Ban,
  Percent,
  CalendarDays,
  TrendingUp,
  Gauge,
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";
import {
  getRentalDashboardAnalytics,
  type AnalyticsViewBy,
  type RentalAnalyticsFilters,
} from "@/lib/admin/rental-analytics";

type DashboardPayload = Awaited<ReturnType<typeof getRentalDashboardAnalytics>>;
type FilterOptions = {
  categories: string[];
  vehicles: { id: string; label: string }[];
  fleet: { id: string; label: string }[];
  dealers: { id: string; name: string }[];
};

const VIEW_OPTIONS: { value: AnalyticsViewBy; label: string }[] = [
  { value: "category", label: "Vehicle Categories" },
  { value: "type", label: "Vehicle Types" },
  { value: "fleet", label: "Fleet Vehicles" },
];

export default function RentalDashboardClient({
  initialData,
  filterOptions,
}: {
  initialData: DashboardPayload;
  filterOptions: FilterOptions;
}) {
  const [pending, startTransition] = useTransition();
  const [viewBy, setViewBy] = useState<AnalyticsViewBy>(initialData.viewBy);
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<RentalAnalyticsFilters>({});

  const chartTitle = useMemo(() => {
    if (viewBy === "category") return "by Vehicle Category";
    if (viewBy === "type") return "by Vehicle Type";
    return "by Fleet Vehicle";
  }, [viewBy]);

  function refresh(nextView: AnalyticsViewBy, nextFilters: RentalAnalyticsFilters) {
    startTransition(async () => {
      const result = await getRentalDashboardAnalytics(nextView, nextFilters);
      setData(result);
      setViewBy(nextView);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold">View By</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {VIEW_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={viewBy === option.value ? "default" : "outline"}
              disabled={pending}
              onClick={() => refresh(option.value, filters)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>From</Label>
            <Input
              type="date"
              className="mt-1.5"
              value={filters.from ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value || null }))}
            />
          </div>
          <div>
            <Label>To</Label>
            <Input
              type="date"
              className="mt-1.5"
              value={filters.to ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value || null }))}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={filters.category ?? "ALL"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, category: value === "ALL" ? null : value }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {filterOptions.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vehicle type</Label>
            <Select
              value={filters.vehicleId ?? "ALL"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, vehicleId: value === "ALL" ? null : value }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {filterOptions.vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button type="button" disabled={pending} onClick={() => refresh(viewBy, filters)}>
            {pending ? "Updating..." : "Apply filters"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setFilters({});
              refresh(viewBy, {});
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={formatPrice(data.metrics.totalRevenueCents / 100)}
          icon={DollarSign}
        />
        <StatsCard title="Total Bookings" value={data.metrics.totalBookings} icon={Car} />
        <StatsCard title="Active Rentals" value={data.metrics.activeRentals} icon={CheckCircle} changeType="positive" />
        <StatsCard title="Completed Rentals" value={data.metrics.completedRentals} icon={Clock} />
        <StatsCard title="Cancelled Rentals" value={data.metrics.cancelledRentals} icon={Ban} />
        <StatsCard
          title="Available Units"
          value={`${data.metrics.availableUnits} / ${data.metrics.totalUnits}`}
          icon={Gauge}
        />
        <StatsCard
          title="Utilization Rate"
          value={`${data.metrics.utilizationRate}%`}
          icon={Percent}
        />
        <StatsCard
          title="Avg Rental Duration"
          value={`${data.metrics.averageRentalDays} days`}
          icon={CalendarDays}
        />
        <StatsCard
          title="Avg Revenue / Booking"
          value={formatPrice(data.metrics.averageRevenuePerBookingCents / 100)}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title={`Revenue ${chartTitle}`}>
          <BarSeries data={data.charts.revenue} dataKey="value" formatter={(v) => formatPrice(Number(v))} />
        </ChartCard>
        <ChartCard title={`Booking Count ${chartTitle}`}>
          <BarSeries data={data.charts.bookings} dataKey="value" />
        </ChartCard>
        <ChartCard title={`Rental Days ${chartTitle}`}>
          <BarSeries data={data.charts.rentalDays} dataKey="value" />
        </ChartCard>
        <ChartCard title={`Utilization % ${chartTitle}`}>
          <BarSeries data={data.charts.utilization} dataKey="value" formatter={(v) => `${v}%`} />
        </ChartCard>
        <ChartCard title={`Average Daily Revenue ${chartTitle}`}>
          <BarSeries
            data={data.charts.averageDailyRevenue}
            dataKey="value"
            formatter={(v) => formatPrice(Number(v))}
          />
        </ChartCard>
        <ChartCard title="Monthly Revenue & Bookings">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.charts.monthly}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} name="Revenue" />
              <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} name="Bookings" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function BarSeries({
  data,
  dataKey,
  formatter,
}: {
  data: { name: string; value: number }[];
  dataKey: string;
  formatter?: (value: number | string) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" className="text-xs" interval={0} angle={-20} textAnchor="end" height={70} />
        <YAxis className="text-xs" />
        <Tooltip formatter={(value) => [formatter ? formatter(Number(value)) : Number(value).toLocaleString(), ""]} />
        <Bar dataKey={dataKey} fill="#dc2626" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
