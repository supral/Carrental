import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/admin/dashboard";
import StatsCard from "@/components/admin/StatsCard";
import DashboardCharts from "@/components/admin/DashboardCharts";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { Car, CheckCircle, Clock, DollarSign, Users, TrendingUp } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const { stats, charts } = await getDashboardStats();

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Overview" }]} />
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Vehicles" value={stats.totalVehicles} icon={Car} />
        <StatsCard title="Active Listings" value={stats.activeListings} icon={CheckCircle} changeType="positive" />
        <StatsCard title="Pending Listings" value={stats.pendingListings} icon={Clock} change={`${stats.pendingListings} awaiting review`} />
        <StatsCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatsCard title="Revenue" value={formatPrice(stats.revenue)} icon={DollarSign} />
        <StatsCard
          title="Monthly Growth"
          value={`${stats.monthlyGrowth > 0 ? "+" : ""}${stats.monthlyGrowth}%`}
          icon={TrendingUp}
          changeType={stats.monthlyGrowth >= 0 ? "positive" : "negative"}
          change={`${formatPrice(stats.monthlyRevenue)} this month`}
        />
      </div>

      <DashboardCharts {...charts} />
    </div>
  );
}
