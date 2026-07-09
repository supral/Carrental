import { DealerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PublicDealerCard = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo: string | null;
  primaryColor: string;
  verified: boolean;
  rating: number;
  address: string;
  phone: string;
  vehicleCount: number;
};

export type PublicDealerProfile = PublicDealerCard & {
  email: string;
  description: string | null;
  totalSales: number;
};

const publicDealerSelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  logo: true,
  primaryColor: true,
  verified: true,
  rating: true,
  address: true,
  phone: true,
  email: true,
  description: true,
  totalSales: true,
} as const;

export async function listPublicDealers(): Promise<PublicDealerCard[]> {
  const dealers = await prisma.dealer.findMany({
    where: { status: DealerStatus.APPROVED },
    select: {
      ...publicDealerSelect,
      _count: { select: { vehicles: { where: { status: "ACTIVE", listingPurpose: "SALE" } } } },
    },
    orderBy: [{ verified: "desc" }, { name: "asc" }],
  });

  return dealers.map((dealer) => ({
    id: dealer.id,
    name: dealer.name,
    slug: dealer.slug,
    tagline: dealer.tagline,
    logo: dealer.logo,
    primaryColor: dealer.primaryColor,
    verified: dealer.verified,
    rating: dealer.rating,
    address: dealer.address,
    phone: dealer.phone,
    vehicleCount: dealer._count.vehicles,
  }));
}

export async function getPublicDealerBySlug(slug: string): Promise<PublicDealerProfile | null> {
  if (!slug || slug === "undefined") return null;

  const dealer = await prisma.dealer.findFirst({
    where: { slug, status: DealerStatus.APPROVED },
    select: {
      ...publicDealerSelect,
      _count: { select: { vehicles: { where: { status: "ACTIVE", listingPurpose: "SALE" } } } },
    },
  });

  if (!dealer) return null;

  return {
    id: dealer.id,
    name: dealer.name,
    slug: dealer.slug,
    tagline: dealer.tagline,
    logo: dealer.logo,
    primaryColor: dealer.primaryColor,
    verified: dealer.verified,
    rating: dealer.rating,
    address: dealer.address,
    phone: dealer.phone,
    email: dealer.email,
    description: dealer.description,
    totalSales: dealer.totalSales,
    vehicleCount: dealer._count.vehicles,
  };
}

export async function getDealerIdBySlug(slug: string): Promise<string | null> {
  const dealer = await prisma.dealer.findFirst({
    where: { slug, status: DealerStatus.APPROVED },
    select: { id: true },
  });
  return dealer?.id ?? null;
}
