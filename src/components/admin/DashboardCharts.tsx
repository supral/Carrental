"use client";

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#dc2626", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444"];

interface DashboardChartsProps {
  listingGrowth: { month: string; listings: number }[];
  revenueAnalytics: { month: string; revenue: number }[];
  userRegistrations: { month: string; users: number }[];
  vehicleCategories: { name: string; value: number }[];
  topDealers: { name: string; totalSales: number; rating: number }[];
}

export default function DashboardCharts({
  listingGrowth,
  revenueAnalytics,
  userRegistrations,
  vehicleCategories,
  topDealers,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Listing Growth">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={listingGrowth}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Line type="monotone" dataKey="listings" stroke="#dc2626" strokeWidth={2} dot={{ fill: "#dc2626" }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Revenue Analytics">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={revenueAnalytics}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Revenue"]} />
            <Bar dataKey="revenue" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="User Registrations">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={userRegistrations}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Vehicle Categories">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={vehicleCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {vehicleCategories.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Dealers" className="lg:col-span-2">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topDealers} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" className="text-xs" />
            <YAxis dataKey="name" type="category" width={120} className="text-xs" />
            <Tooltip />
            <Bar dataKey="totalSales" fill="#dc2626" radius={[0, 4, 4, 0]} name="Total Sales" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-6 shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
