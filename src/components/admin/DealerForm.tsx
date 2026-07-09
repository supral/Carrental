"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DealerStatus } from "@prisma/client";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDealer,
  suggestDealerSlug,
  updateDealer,
} from "@/lib/admin/dealer-actions";
import { slugifyDealerName, getDealerSitePath } from "@/lib/dealers/dealer-slug";

const dealerSchema = z.object({
  name: z.string().min(2, "Dealer name is required"),
  slug: z
    .string()
    .min(2, "Site URL slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone is required"),
  address: z.string().min(5, "Address is required"),
  description: z.string().optional(),
  tagline: z.string().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  verified: z.boolean(),
  status: z.nativeEnum(DealerStatus),
});

type DealerFormValues = z.infer<typeof dealerSchema>;

const textareaClass =
  "flex min-h-[100px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function DealerForm({
  mode,
  dealerId,
  initial,
}: {
  mode: "create" | "edit";
  dealerId?: string;
  initial?: Partial<DealerFormValues>;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DealerFormValues>({
    resolver: zodResolver(dealerSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      address: initial?.address ?? "",
      description: initial?.description ?? "",
      tagline: initial?.tagline ?? "",
      logo: initial?.logo ?? "",
      primaryColor: initial?.primaryColor ?? "#dc2626",
      verified: initial?.verified ?? false,
      status: initial?.status ?? DealerStatus.PENDING,
    },
  });

  const name = watch("name");
  const slug = watch("slug");
  const verified = watch("verified");
  const status = watch("status");

  useEffect(() => {
    if (slugTouched || mode === "edit" || !name.trim()) return;

    const nextSlug = slugifyDealerName(name);
    setValue("slug", nextSlug, { shouldValidate: true });
  }, [name, slugTouched, mode, setValue]);

  const onSubmit = async (values: DealerFormValues) => {
    setSubmitError("");
    try {
      if (mode === "create") {
        const result = await createDealer(values);
        router.push(`/admin/dealers?created=${result.slug}`);
      } else if (dealerId) {
        await updateDealer(dealerId, values);
        router.push("/admin/dealers?updated=1");
      }
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save dealer");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Dealer profile</h2>
        <div>
          <Label htmlFor="name">Dealer name</Label>
          <Input id="name" className="mt-1.5" {...register("name")} placeholder="Everest Car Rental" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            className="mt-1.5"
            {...register("tagline")}
            placeholder="Best Car Dealership in Darwin"
          />
        </div>
        <div>
          <Label htmlFor="description">About</Label>
          <textarea
            id="description"
            className={`${textareaClass} mt-1.5`}
            {...register("description")}
            placeholder="Short description for the dealer's public site"
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Dealer site</h2>
        <p className="text-sm text-muted-foreground">
          Each dealer gets a public mini-site at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">/dealers/your-slug</code>
        </p>
        <div>
          <Label htmlFor="slug">Site URL slug</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="slug"
              {...register("slug")}
              onChange={(event) => {
                setSlugTouched(true);
                register("slug").onChange(event);
              }}
              placeholder="nb-automotive"
            />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const suggested = await suggestDealerSlug(name || "dealer");
                setValue("slug", suggested, { shouldValidate: true });
                setSlugTouched(true);
              }}
            >
              Suggest
            </Button>
          </div>
          {slug && (
            <p className="mt-1 text-xs text-muted-foreground">
              Public site: {getDealerSitePath(slug)}
            </p>
          )}
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="primaryColor">Brand colour</Label>
            <Input id="primaryColor" type="color" className="mt-1.5 h-11 p-1" {...register("primaryColor")} />
          </div>
          <div>
            <Label htmlFor="logo">Logo URL (optional)</Label>
            <Input id="logo" className="mt-1.5" {...register("logo")} placeholder="https://..." />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" className="mt-1.5" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" className="mt-1.5" {...register("phone")} />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" className="mt-1.5" {...register("address")} />
            {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Approval status</Label>
            <Select value={status} onValueChange={(value) => setValue("status", value as DealerStatus)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DealerStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={DealerStatus.APPROVED}>Approved (site live)</SelectItem>
                <SelectItem value={DealerStatus.SUSPENDED}>Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={verified}
                onCheckedChange={(checked) => setValue("verified", checked === true)}
              />
              Verified dealer badge
            </label>
          </div>
        </div>
      </section>

      {submitError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create Dealer" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/dealers">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
