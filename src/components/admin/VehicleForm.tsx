"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VehicleCategory, VehicleStatus } from "@prisma/client";
import { createVehicle } from "@/lib/admin/actions";
import { siteConfig } from "@/data/services";
import {
  createVehicleSchema,
  collectImageUrls,
  ListingPurpose,
  LISTING_PURPOSE_LABELS,
  type CreateVehicleFormValues,
} from "@/lib/admin/vehicle-schema";
import RentalCardFeaturesForm from "@/components/admin/RentalCardFeaturesForm";
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
import { cn } from "@/lib/utils";
import Link from "next/link";
import VehicleImageUpload from "@/components/admin/VehicleImageUpload";
import VehicleRentalOptionsChecklist, {
  type RentalOptionRow,
} from "@/components/admin/VehicleRentalOptionsChecklist";
import VehicleTemplateFieldsForm, {
  templateSelectionsToInputs,
  type TemplateFieldDefinition,
  type TemplateFieldValueState,
} from "@/components/admin/VehicleTemplateFieldsForm";
import VehicleCustomFieldsForm from "@/components/admin/VehicleCustomFieldsForm";
import VehicleDetailsEditor from "@/components/admin/VehicleDetailsEditor";
import { getVehicleTypeWithTemplate } from "@/lib/admin/vehicle-type-actions";
import type { CustomFieldInput } from "@/lib/vehicles/vehicle-specs-service";
import {
  getDefaultDetailSections,
  type VehicleDetailsDocument,
} from "@/lib/vehicles/vehicle-details";
import {
  SALE_BODY_TYPES,
  SALE_CONDITIONS,
  SALE_DRIVE_TYPES,
  SALE_FUEL_TYPES,
  SALE_TRANSMISSIONS,
  buildSaleCustomFields,
  mergeSaleCustomFields,
  type SaleExtraFields,
} from "@/lib/vehicles/sale-vehicle-fields";
import SaleVehicleExtraFieldsForm from "@/components/admin/SaleVehicleExtraFieldsForm";
import { Car, KeyRound } from "lucide-react";
import type { AssignableOfferOption } from "@/lib/admin/offer-actions";
import { LoadingLabel } from "@/components/ui/loading";

const PURPOSE_OPTIONS: { value: ListingPurpose; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: ListingPurpose.SALE,
    label: LISTING_PURPOSE_LABELS.SALE,
    description: "Listed on the buy/sell marketplace for customers to purchase",
    icon: Car,
  },
  {
    value: ListingPurpose.RENTAL,
    label: LISTING_PURPOSE_LABELS.RENTAL,
    description: "Listed in the car rental fleet for hire bookings",
    icon: KeyRound,
  },
];

interface DealerOption {
  id: string;
  name: string;
}

interface VehicleTypeOption {
  id: string;
  name: string;
}

const FUEL_TYPES = [...SALE_FUEL_TYPES];
const TRANSMISSIONS = [...SALE_TRANSMISSIONS];
const BODY_TYPES = [...SALE_BODY_TYPES];
const CONDITIONS = [...SALE_CONDITIONS];
const DRIVE_TYPES = [...SALE_DRIVE_TYPES];

function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-6 shadow-sm", className)}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const textareaClass =
  "flex min-h-[100px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function VehicleForm({
  dealers,
  vehicleTypes,
  rentalOptions,
  assignableOffers = [],
  canPublishLive = false,
  rentalOnly = false,
}: {
  dealers: DealerOption[];
  vehicleTypes: VehicleTypeOption[];
  rentalOptions: RentalOptionRow[];
  assignableOffers?: AssignableOfferOption[];
  canPublishLive?: boolean;
  rentalOnly?: boolean;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState("");
  const [imageError, setImageError] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedRentalOptionIds, setSelectedRentalOptionIds] = useState<string[]>([]);
  const [selectedSeasonOfferId, setSelectedSeasonOfferId] = useState("");
  const [templateFields, setTemplateFields] = useState<TemplateFieldDefinition[]>([]);
  const [selectedTemplateFieldIds, setSelectedTemplateFieldIds] = useState<string[]>([]);
  const [templateValueOverrides, setTemplateValueOverrides] = useState<TemplateFieldValueState>({});
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>([]);
  const [saleExtra, setSaleExtra] = useState<SaleExtraFields>({});
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetailsDocument>({
    sections: getDefaultDetailSections("Sedan", rentalOnly ? "rental" : "sale"),
  });
  const [cardFeatures, setCardFeatures] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateVehicleFormValues>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      title: "",
      vehicleNumber: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      price: 0,
      mileage: 0,
      fuelType: "Petrol",
      transmission: "Automatic",
      bodyType: "Sedan",
      category: VehicleCategory.CARS,
      listingPurpose: rentalOnly ? ListingPurpose.RENTAL : ListingPurpose.SALE,
      condition: "Used",
      color: "",
      doors: "",
      seats: "",
      driveType: "",
      location: siteConfig.location,
      status: canPublishLive ? VehicleStatus.ACTIVE : VehicleStatus.PENDING,
      featured: false,
      totalUnits: 0,
      dealerId: dealers[0]?.id ?? "",
      imageUrls: "",
    },
  });

  const status = watch("status");
  const dealerId = watch("dealerId");
  const featured = watch("featured");
  const listingPurpose = watch("listingPurpose");
  const bodyType = watch("bodyType");
  const vehicleTypeId = watch("vehicleTypeId");
  const isRental = rentalOnly || listingPurpose === ListingPurpose.RENTAL;

  useEffect(() => {
    if (!rentalOnly) return;
    setValue("make", "Rental");
    setValue("model", "Type");
    setValue("year", new Date().getFullYear());
    setValue("mileage", 0);
  }, [rentalOnly, setValue]);

  useEffect(() => {
    if (!vehicleTypeId) {
      setTemplateFields([]);
      setSelectedTemplateFieldIds([]);
      setTemplateValueOverrides({});
      return;
    }

    let cancelled = false;
    getVehicleTypeWithTemplate(vehicleTypeId).then((type) => {
      if (cancelled || !type) return;
      const fields = type.templateFields.map((field) => ({
        id: field.id,
        name: field.name,
        inputType: field.inputType,
        required: field.required,
        sortOrder: field.sortOrder,
        group: field.group,
        defaultValue: field.defaultValue,
      }));
      setTemplateFields(fields);
      setSelectedTemplateFieldIds((current) =>
        current.filter((id) => fields.some((field) => field.id === id))
      );
      const matchedType = vehicleTypes.find((row) => row.id === vehicleTypeId);
      if (matchedType) {
        setValue("bodyType", matchedType.name, { shouldValidate: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [vehicleTypeId, vehicleTypes, setValue]);

  const onSubmit = async (values: CreateVehicleFormValues) => {
    setSubmitError("");
    setImageError("");

    if (collectImageUrls(values.imageUrls, uploadedImages).length === 0) {
      setImageError("Add at least one image from your device or a URL");
      return;
    }

    try {
      const mergedCustomFields = isRental
        ? customFields
        : mergeSaleCustomFields(buildSaleCustomFields(saleExtra), customFields);

      const result = await createVehicle(
        values,
        uploadedImages,
        undefined,
        isRental ? undefined : vehicleDetails,
        templateSelectionsToInputs(templateFields, selectedTemplateFieldIds, templateValueOverrides),
        mergedCustomFields,
        !isRental && selectedSeasonOfferId ? selectedSeasonOfferId : undefined,
        rentalOnly ? cardFeatures : undefined
      );
      router.push(`/admin/vehicles?created=${result.id}`);
      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create vehicle");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {!rentalOnly && (
      <FieldGroup title="Listing Purpose" description="Choose whether this vehicle is for sale or rental.">
        <div className="grid gap-3 sm:grid-cols-2">
          {PURPOSE_OPTIONS.map((option) => {
            const selected = listingPurpose === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setValue("listingPurpose", option.value, { shouldValidate: true });
                  if (option.value === ListingPurpose.RENTAL) {
                    setValue("featured", false);
                    setValue("vehicleNumber", "");
                    setVehicleDetails({ sections: getDefaultDetailSections(bodyType || "Sedan", "rental") });
                  } else {
                    setVehicleDetails({ sections: getDefaultDetailSections(bodyType || "Sedan", "sale") });
                  }
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <option.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{option.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.listingPurpose?.message && (
          <p className="mt-2 text-xs text-red-600">{errors.listingPurpose.message}</p>
        )}
      </FieldGroup>
      )}

      {!isRental ? (
        <>
          <FieldGroup
            title="Listing Title"
            description="Full listing headline shown on the marketplace and vehicle page."
          >
            <Field label="Listing title" error={errors.title?.message}>
              <Input
                placeholder="e.g. 2010 MITSUBISHI OUTLANDER RX"
                {...register("title")}
                className="uppercase"
              />
            </Field>
          </FieldGroup>

          <FieldGroup title="Basic vehicle details" description="Core identification for this sale listing.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Make" error={errors.make?.message}>
                <Input placeholder="MITSUBISHI" {...register("make")} />
              </Field>
              <Field label="Model" error={errors.model?.message}>
                <Input placeholder="OUTLANDER" {...register("model")} />
              </Field>
              <Field label="Construction year" error={errors.year?.message}>
                <Input type="number" {...register("year", { valueAsNumber: true })} />
              </Field>
              <Field label="Sale price (AUD)" error={errors.price?.message}>
                <Input type="number" min={0} step={1} {...register("price", { valueAsNumber: true })} />
              </Field>
              <Field label="Dealer" error={errors.dealerId?.message} className="sm:col-span-2">
                <Select value={dealerId} onValueChange={(v) => setValue("dealerId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select dealer" /></SelectTrigger>
                  <SelectContent>
                    {dealers.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id}>{dealer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-5">
              <SaleVehicleExtraFieldsForm value={saleExtra} onChange={setSaleExtra} />
            </div>
          </FieldGroup>

          <FieldGroup title="Additional specifications" description="Mechanical and physical details buyers filter by.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Transmission" error={errors.transmission?.message}>
                <Select value={watch("transmission")} onValueChange={(v) => setValue("transmission", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fuel type" error={errors.fuelType?.message}>
                <Select value={watch("fuelType")} onValueChange={(v) => setValue("fuelType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Drivetrain" error={errors.driveType?.message}>
                <Select value={watch("driveType") || ""} onValueChange={(v) => setValue("driveType", v)}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {DRIVE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Body type" error={errors.bodyType?.message}>
                <Select value={watch("bodyType")} onValueChange={(v) => setValue("bodyType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BODY_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Seats" error={errors.seats?.message}>
                <Input type="number" min={1} placeholder="5" {...register("seats")} />
              </Field>
              <Field label="Doors" error={errors.doors?.message}>
                <Input type="number" min={0} placeholder="4" {...register("doors")} />
              </Field>
              <Field label="Exterior colour" error={errors.color?.message}>
                <Input placeholder="White" {...register("color")} />
              </Field>
              <Field label="Location" error={errors.location?.message} className="sm:col-span-2">
                <Input placeholder={siteConfig.location} {...register("location")} />
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup title="Vehicle history" description="Condition, odometer, and stock identification.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Condition" error={errors.condition?.message}>
                <Select value={watch("condition")} onValueChange={(v) => setValue("condition", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Odometer reading (km)" error={errors.mileage?.message}>
                <Input type="number" min={0} {...register("mileage", { valueAsNumber: true })} />
              </Field>
              <Field label="Stock ID" error={errors.vehicleNumber?.message}>
                <Input placeholder="e.g. CG57VM" {...register("vehicleNumber")} className="uppercase" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Dealer stock number shown on sale listings.
                </p>
              </Field>
            </div>
          </FieldGroup>
        </>
      ) : rentalOnly ? (
        <>
          <FieldGroup
            title="Listing"
            description="Marketing details customers see when browsing rental types."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Listing title" error={errors.title?.message} className="sm:col-span-2">
                <Input placeholder="e.g. Toyota Hilux SR5" {...register("title")} />
              </Field>
              <Field label="Daily rate (AUD)" error={errors.price?.message}>
                <Input type="number" min={0} step={1} {...register("price", { valueAsNumber: true })} />
              </Field>
            </div>
          </FieldGroup>

          <FieldGroup title="Type image" description="Photos shown on the rental listing.">
            <VehicleImageUpload
              images={uploadedImages}
              onChange={setUploadedImages}
              onUploadingChange={setUploadingImages}
              error={imageError}
            />
          </FieldGroup>

          <FieldGroup
            title="Card features"
            description="These appear automatically on the public rental search card."
          >
            <RentalCardFeaturesForm features={cardFeatures} onChange={setCardFeatures} />
          </FieldGroup>
        </>
      ) : (
        <FieldGroup
          title="Basic Information"
          description="Rental fleet listing details."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Listing Title" error={errors.title?.message} className="sm:col-span-2">
              <Input placeholder="e.g. 2023 Toyota Hilux SR5" {...register("title")} />
            </Field>
            <Field label="Make" error={errors.make?.message}>
              <Input placeholder="Toyota" {...register("make")} />
            </Field>
            <Field label="Model" error={errors.model?.message}>
              <Input placeholder="Hilux SR5" {...register("model")} />
            </Field>
            <Field label="Year" error={errors.year?.message}>
              <Input type="number" {...register("year", { valueAsNumber: true })} />
            </Field>
            <Field label="Daily Rate (AUD)" error={errors.price?.message}>
              <Input type="number" min={0} step={1} {...register("price", { valueAsNumber: true })} />
            </Field>
            <Field label="Dealer" error={errors.dealerId?.message} className="sm:col-span-2">
              <Select value={dealerId} onValueChange={(v) => setValue("dealerId", v)}>
                <SelectTrigger><SelectValue placeholder="Select dealer" /></SelectTrigger>
                <SelectContent>
                  {dealers.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id}>{dealer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FieldGroup>
      )}

      <FieldGroup
        title="Specifications"
        description={
          rentalOnly
            ? "Select specification fields shown on this vehicle type listing."
            : "Select a type, then tick which specifications to show on this vehicle's details page."
        }
      >
        {!rentalOnly && (
        <Field label="Vehicle Type" error={errors.vehicleTypeId?.message} className="max-w-md">
          <Select
            value={vehicleTypeId || "none"}
            onValueChange={(value) =>
              setValue("vehicleTypeId", value === "none" ? undefined : value, { shouldValidate: true })
            }
          >
            <SelectTrigger><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No type (legacy)</SelectItem>
              {vehicleTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        )}

        {rentalOnly && (
          <Field label="Specification template" error={errors.vehicleTypeId?.message} className="max-w-md">
            <Select
              value={vehicleTypeId || "none"}
              onValueChange={(value) =>
                setValue("vehicleTypeId", value === "none" ? undefined : value, { shouldValidate: true })
              }
            >
              <SelectTrigger><SelectValue placeholder="Optional template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {vehicleTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <div className="mt-5">
          <VehicleTemplateFieldsForm
            fields={templateFields}
            selectedIds={selectedTemplateFieldIds}
            valueOverrides={templateValueOverrides}
            onChangeSelected={setSelectedTemplateFieldIds}
            onChangeOverrides={setTemplateValueOverrides}
          />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold">Custom Fields</h3>
          <VehicleCustomFieldsForm fields={customFields} onChange={setCustomFields} />
        </div>
      </FieldGroup>

      {isRental && !rentalOnly && (
        <FieldGroup
          title="Physical fleet units"
          description="Physical cars are managed separately so you can reuse this type for many units."
        >
          <p className="text-sm text-muted-foreground">
            After saving this vehicle type, add units under{" "}
            <a href="/admin/fleet" className="font-medium text-primary hover:underline">
              Rental Fleet
            </a>
            . Availability on the website is calculated from those units.
          </p>
          <input type="hidden" {...register("totalUnits", { valueAsNumber: true })} />
        </FieldGroup>
      )}

      {rentalOnly && (
        <FieldGroup title="Publishing">
          <input type="hidden" {...register("dealerId")} />
          <input type="hidden" {...register("totalUnits", { valueAsNumber: true })} />
          <div className="max-w-md">
            <Field label="Status" error={errors.status?.message}>
              {canPublishLive ? (
                <Select value={status} onValueChange={(v) => setValue("status", v as VehicleStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VehicleStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={VehicleStatus.PENDING}>Pending Review</SelectItem>
                    <SelectItem value={VehicleStatus.ACTIVE}>Active (Live)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                  Submitted for super admin review.
                </p>
              )}
            </Field>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Add physical cars under{" "}
            <a href="/admin/fleet" className="font-medium text-primary hover:underline">
              Rental Fleet
            </a>{" "}
            after saving. Rental options are set per fleet unit there.
          </p>
        </FieldGroup>
      )}

      {!isRental && (
        <FieldGroup
          title="Season Offer"
          description="Optionally assign a promotional offer from Marketing → Offers."
        >
          {assignableOffers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No offers created yet.{" "}
              <Link href="/admin/marketing/offers" className="text-primary hover:underline">
                Create an offer
              </Link>{" "}
              first, then assign it here or from Vehicle Management.
            </p>
          ) : (
            <div className="max-w-md">
              <Label className="mb-1.5 block">Assign offer (optional)</Label>
              <Select
                value={selectedSeasonOfferId || "_none"}
                onValueChange={(value) => setSelectedSeasonOfferId(value === "_none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No offer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No offer</SelectItem>
                  {assignableOffers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.label} · {offer.offerType} · {offer.discountLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </FieldGroup>
      )}

      {isRental && !rentalOnly && (
        <FieldGroup title="Specifications" description="Technical details shown on the rental listing.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Mileage (km)" error={errors.mileage?.message}>
              <Input type="number" min={0} {...register("mileage", { valueAsNumber: true })} />
            </Field>
            <Field label="Fuel Type" error={errors.fuelType?.message}>
              <Select value={watch("fuelType")} onValueChange={(v) => setValue("fuelType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Transmission" error={errors.transmission?.message}>
              <Select value={watch("transmission")} onValueChange={(v) => setValue("transmission", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSMISSIONS.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Body Type" error={errors.bodyType?.message}>
              <Select value={watch("bodyType")} onValueChange={(v) => setValue("bodyType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BODY_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Condition" error={errors.condition?.message}>
              <Select value={watch("condition")} onValueChange={(v) => setValue("condition", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Drive Type" error={errors.driveType?.message}>
              <Select value={watch("driveType") || ""} onValueChange={(v) => setValue("driveType", v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {DRIVE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Colour" error={errors.color?.message}>
              <Input placeholder="White" {...register("color")} />
            </Field>
            <Field label="Doors" error={errors.doors?.message}>
              <Input type="number" min={0} placeholder="4" {...register("doors")} />
            </Field>
            <Field label="Seats" error={errors.seats?.message}>
              <Input type="number" min={1} placeholder="5" {...register("seats")} />
            </Field>
            <Field label="Location" error={errors.location?.message} className="sm:col-span-2">
              <Input {...register("location")} />
            </Field>
          </div>
        </FieldGroup>
      )}

      {!rentalOnly && (
      <FieldGroup
        title={isRental ? "Vehicle Details" : "Description"}
        description={
          isRental
            ? "Structured detail sections customers can open from the vehicle page."
            : "Full listing description, overview, and key features shown to buyers."
        }
      >
        <VehicleDetailsEditor
          value={vehicleDetails}
          onChange={setVehicleDetails}
          bodyType={bodyType || "Sedan"}
          listingPurpose={isRental ? "rental" : "sale"}
        />
      </FieldGroup>
      )}

      {!rentalOnly && (
      <FieldGroup title="Images & Publishing" description="Upload photos from your device or add image URLs.">
        <div className="space-y-4">
          <VehicleImageUpload
            images={uploadedImages}
            onChange={setUploadedImages}
            onUploadingChange={setUploadingImages}
            error={imageError}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" error={errors.status?.message}>
              {canPublishLive ? (
                <Select value={status} onValueChange={(v) => setValue("status", v as VehicleStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VehicleStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={VehicleStatus.PENDING}>Pending Review</SelectItem>
                    <SelectItem value={VehicleStatus.ACTIVE}>Active (Live)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                  Submissions are sent as <strong>Pending Review</strong>. Super Admin must verify details before publishing.
                </p>
              )}
            </Field>
            <div className="flex items-end pb-2">
              <label className={cn("flex items-center gap-2 text-sm font-medium", isRental && "opacity-50")}>
                <Checkbox
                  checked={featured}
                  disabled={isRental}
                  onCheckedChange={(checked) => setValue("featured", checked === true)}
                />
                Feature on homepage
              </label>
            </div>
          </div>
        </div>
      </FieldGroup>
      )}

      {submitError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30">{submitError}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/vehicles">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting || uploadingImages}>
          {isSubmitting ? (
            <LoadingLabel label="Creating..." />
          ) : uploadingImages ? (
            <LoadingLabel label="Uploading..." />
          ) : rentalOnly ? (
            "Create Vehicle Type"
          ) : (
            "Create Vehicle"
          )}
        </Button>
      </div>
    </form>
  );
}
