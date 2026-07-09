import { FormType, Vehicle, VehicleFilters } from "@/types";

function siteApiBase() {
  if (typeof window !== "undefined") return "";
  return process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

interface ApiErrorBody {
  success: false;
  error?: string;
  errors?: { field: string; message: string }[];
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();

  if (!res.ok) {
    const body = json as ApiErrorBody;
    const fieldErrors = body.errors?.map((e) => e.message).join(", ");
    throw new Error(fieldErrors || body.error || "Request failed");
  }

  return json as T;
}

export async function uploadLicencePhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads/licence", {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to upload licence photo");
  }

  return json.url as string;
}

export async function submitForm(
  formType: FormType,
  data: Record<string, string>
): Promise<{ message: string; id?: string }> {
  const res = await fetch(`/api/forms/${formType}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await handleResponse<{
    success: boolean;
    message: string;
    data?: { id: string };
  }>(res);

  return {
    message: json.message || "Your enquiry has been received.",
    id: json.data?.id,
  };
}

function buildVehicleQuery(filters?: Partial<VehicleFilters> & { featured?: boolean }): string {
  if (!filters) return "?listingPurpose=sale";

  const params = new URLSearchParams();
  params.set("listingPurpose", filters.listingPurpose || "sale");
  if (filters.search) params.set("search", filters.search);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.year) params.set("year", filters.year);
  if (filters.fuelType) params.set("fuelType", filters.fuelType);
  if (filters.transmission) params.set("transmission", filters.transmission);
  if (filters.bodyType) params.set("bodyType", filters.bodyType);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.featured) params.set("featured", "true");

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchVehicles(filters?: Partial<VehicleFilters>): Promise<Vehicle[]> {
  const res = await fetch(`${siteApiBase()}/api/vehicles${buildVehicleQuery(filters)}`, {
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: Vehicle[] }>(res);
  return json.data || [];
}

export async function fetchFeaturedVehicles(
  listingPurpose: "sale" | "rental" = "sale"
): Promise<Vehicle[]> {
  const res = await fetch(
    `${siteApiBase()}/api/vehicles/featured?listingPurpose=${listingPurpose}`,
    { cache: "no-store" }
  );
  const json = await handleResponse<{ success: boolean; data: Vehicle[] }>(res);
  return json.data || [];
}

export async function fetchVehicleById(id: string): Promise<Vehicle | null> {
  try {
    const res = await fetch(`${siteApiBase()}/api/vehicles/${id}`, {
      cache: "no-store",
    });
    const json = await handleResponse<{ success: boolean; data: Vehicle }>(res);
    return json.data || null;
  } catch {
    return null;
  }
}

export async function fetchVehiclesByIds(ids: string[]): Promise<Vehicle[]> {
  if (ids.length === 0) return [];
  const res = await fetch(`${siteApiBase()}/api/vehicles/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: Vehicle[] }>(res);
  return json.data || [];
}
