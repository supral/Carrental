import { prisma } from "@/lib/prisma";
import { VehicleStatus, DealerStatus, UserStatus, ListingPurpose } from "@prisma/client";
import { subMonths, startOfMonth, format } from "date-fns";
import { summarizeVehicleOfferDiscounts } from "@/lib/vehicles/vehicle-offers";

const vehicleOfferSelect = {
  price: true,
  isOnOffer: true,
  offerType: true,
  offerDiscountType: true,
  offerAmount: true,
  offerPercent: true,
  discountedPrice: true,
  offerStartDate: true,
  offerEndDate: true,
  seasonOffer: {
    select: {
      name: true,
      offerType: true,
      offerDiscountType: true,
      offerAmount: true,
      offerPercent: true,
      offerStartDate: true,
      offerEndDate: true,
      isEnabled: true,
    },
  },
} as const;

export async function getDashboardStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const [
    totalVehicles,
    activeListings,
    pendingListings,
    soldVehicles,
    totalDealers,
    totalUsers,
    soldThisMonth,
    soldLastMonth,
    newUsersThisMonth,
    vehiclesByCategory,
    topDealers,
    monthlyListings,
    activeSaleVehiclesWithOffers,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { status: VehicleStatus.ACTIVE } }),
    prisma.vehicle.count({ where: { status: VehicleStatus.PENDING } }),
    prisma.vehicle.count({ where: { status: VehicleStatus.SOLD } }),
    prisma.dealer.count(),
    prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    prisma.vehicle.count({ where: { status: VehicleStatus.SOLD, soldAt: { gte: monthStart } } }),
    prisma.vehicle.count({ where: { status: VehicleStatus.SOLD, soldAt: { gte: lastMonthStart, lt: monthStart } } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.vehicle.groupBy({ by: ["category"], _count: true }),
    prisma.dealer.findMany({ take: 5, orderBy: { totalSales: "desc" }, select: { name: true, totalSales: true, rating: true } }),
    prisma.vehicle.groupBy({
      by: ["createdAt"],
      _count: true,
      where: { createdAt: { gte: subMonths(now, 6) } },
    }),
    prisma.vehicle.findMany({
      where: {
        listingPurpose: ListingPurpose.SALE,
        status: { in: [VehicleStatus.ACTIVE, VehicleStatus.PENDING] },
      },
      select: vehicleOfferSelect,
    }),
  ]);

  const offerDiscounts = summarizeVehicleOfferDiscounts(activeSaleVehiclesWithOffers);

  const soldVehiclesData = await prisma.vehicle.findMany({
    where: { status: VehicleStatus.SOLD },
    select: { price: true, soldAt: true },
  });

  const revenue = soldVehiclesData.reduce((sum, v) => sum + v.price, 0);
  const monthlyRevenue = soldVehiclesData
    .filter((v) => v.soldAt && v.soldAt >= monthStart)
    .reduce((sum, v) => sum + v.price, 0);

  const growth = soldLastMonth > 0
    ? Math.round(((soldThisMonth - soldLastMonth) / soldLastMonth) * 100)
    : soldThisMonth > 0 ? 100 : 0;

  const listingGrowth = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i);
    const label = format(date, "MMM");
    const count = monthlyListings.filter(
      (m) => format(new Date(m.createdAt), "MMM yyyy") === format(date, "MMM yyyy")
    ).reduce((s, m) => s + m._count, 0);
    return { month: label, listings: count };
  });

  const userRegistrations = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i);
    return { month: format(date, "MMM"), users: Math.floor(Math.random() * 20) + newUsersThisMonth / 6 };
  });

  const revenueAnalytics = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i);
    const monthRev = soldVehiclesData
      .filter((v) => v.soldAt && format(v.soldAt, "MMM yyyy") === format(date, "MMM yyyy"))
      .reduce((s, v) => s + v.price, 0);
    return { month: format(date, "MMM"), revenue: monthRev };
  });

  return {
    stats: {
      totalVehicles,
      activeListings,
      pendingListings,
      soldVehicles,
      totalDealers,
      totalUsers,
      revenue,
      monthlyRevenue,
      monthlyGrowth: growth,
      offerDiscountExposure: offerDiscounts.totalSavings,
      vehiclesOnOffer: offerDiscounts.vehiclesOnOffer,
      offerListValue: offerDiscounts.totalListPrice,
      offerSaleValue: offerDiscounts.totalOfferPrice,
      averageOfferDiscount: offerDiscounts.averageSavingsPerVehicle,
    },
    charts: {
      listingGrowth,
      revenueAnalytics,
      userRegistrations,
      vehicleCategories: vehiclesByCategory.map((c) => ({
        name: c.category.replace("_", " "),
        value: c._count,
      })),
      topDealers,
    },
  };
}
