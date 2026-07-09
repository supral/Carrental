"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Car, BadgeDollarSign, KeyRound } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterOptionsQuery } from "@/hooks/use-vehicles";
import { toQueryString } from "@/lib/search-params";
import { cn } from "@/lib/utils";

type SearchMode = "buy" | "sell" | "rent";

const modes: { value: SearchMode; label: string; icon: React.ElementType }[] = [
  { value: "buy", label: "Buy Car", icon: Car },
  { value: "sell", label: "Sell Car", icon: BadgeDollarSign },
  { value: "rent", label: "Rent Car", icon: KeyRound },
];

const rentalTypes = ["Economy Sedan", "SUV / 4WD", "Ute", "Van"];

export default function HeroSearchWidget() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("buy");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [maxKm, setMaxKm] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [condition, setCondition] = useState("");
  const [sellYear, setSellYear] = useState("");
  const [sellMileage, setSellMileage] = useState("");
  const [rentalType, setRentalType] = useState("");
  const [rentalLocation, setRentalLocation] = useState("Darwin, NT");

  const { data: filterOptions } = useFilterOptionsQuery("cars");
  const models = make && filterOptions?.models[make] ? filterOptions.models[make] : [];

  const resetBuyFilters = () => {
    setMake("");
    setModel("");
    setMinPrice("");
    setMaxPrice("");
    setMinYear("");
    setMaxYear("");
    setMaxKm("");
    setBodyType("");
    setFuelType("");
    setTransmission("");
    setCondition("");
  };

  const handleBuySearch = () => {
    const params = toQueryString({
      category: "cars",
      make: make || undefined,
      model: model || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      minYear: minYear || undefined,
      maxYear: maxYear || undefined,
      maxKm: maxKm || undefined,
      bodyType: bodyType || undefined,
      fuelType: fuelType || undefined,
      transmission: transmission || undefined,
      condition: condition || undefined,
    });
    router.push(`/vehicles?${params}`);
  };

  const handleSellSearch = () => {
    const params = new URLSearchParams({ subject: "sell" });
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (sellYear) params.set("year", sellYear);
    if (sellMileage) params.set("mileage", sellMileage);
    router.push(`/contact?${params.toString()}`);
  };

  const handleRentSearch = () => {
    const params = new URLSearchParams();
    if (rentalType) params.set("type", rentalType);
    if (rentalLocation) params.set("location", rentalLocation);
    router.push(`/car-rental?${params.toString()}#book`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="mx-auto w-full max-w-5xl"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100">
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as SearchMode);
            resetBuyFilters();
          }}
        >
          <TabsList className="mb-6 grid h-auto w-full grid-cols-3 gap-1 p-1">
            {modes.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold sm:text-base"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <AnimatePresence mode="wait">
          {mode === "buy" && (
            <motion.div
              key="buy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="hero-make">Make</Label>
                  <Select value={make} onValueChange={(v) => { setMake(v); setModel(""); }}>
                    <SelectTrigger id="hero-make" className="mt-1.5">
                      <SelectValue placeholder="Any make" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions?.makes.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hero-model">Model</Label>
                  <Select value={model} onValueChange={setModel} disabled={!make}>
                    <SelectTrigger id="hero-model" className="mt-1.5">
                      <SelectValue placeholder="Any model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hero-body">Body Type</Label>
                  <Select value={bodyType || "all"} onValueChange={(v) => setBodyType(v === "all" ? "" : v)}>
                    <SelectTrigger id="hero-body" className="mt-1.5">
                      <SelectValue placeholder="Any body type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any body type</SelectItem>
                      {filterOptions?.bodyTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hero-fuel">Fuel Type</Label>
                  <Select value={fuelType || "all"} onValueChange={(v) => setFuelType(v === "all" ? "" : v)}>
                    <SelectTrigger id="hero-fuel" className="mt-1.5">
                      <SelectValue placeholder="Any fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any fuel type</SelectItem>
                      {filterOptions?.fuelTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="hero-transmission">Transmission</Label>
                  <Select value={transmission || "all"} onValueChange={(v) => setTransmission(v === "all" ? "" : v)}>
                    <SelectTrigger id="hero-transmission" className="mt-1.5">
                      <SelectValue placeholder="Any transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any transmission</SelectItem>
                      {filterOptions?.transmissions.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hero-condition">Condition</Label>
                  <Select value={condition || "all"} onValueChange={(v) => setCondition(v === "all" ? "" : v)}>
                    <SelectTrigger id="hero-condition" className="mt-1.5">
                      <SelectValue placeholder="Any condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any condition</SelectItem>
                      {filterOptions?.conditions.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hero-min-year">From Year</Label>
                  <Input
                    id="hero-min-year"
                    type="number"
                    placeholder="e.g. 2018"
                    value={minYear}
                    onChange={(e) => setMinYear(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="hero-max-year">To Year</Label>
                  <Input
                    id="hero-max-year"
                    type="number"
                    placeholder="e.g. 2024"
                    value={maxYear}
                    onChange={(e) => setMaxYear(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="hero-min-price">Min Price</Label>
                  <Input
                    id="hero-min-price"
                    type="number"
                    placeholder="e.g. 15000"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="hero-max-price">Max Price</Label>
                  <Input
                    id="hero-max-price"
                    type="number"
                    placeholder="e.g. 50000"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="hero-max-km">Max Km</Label>
                  <Input
                    id="hero-max-km"
                    type="number"
                    placeholder="e.g. 100000"
                    value={maxKm}
                    onChange={(e) => setMaxKm(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <Button size="lg" className="w-full min-w-[200px] sm:w-auto" onClick={handleBuySearch}>
                <Search className="h-5 w-5" />
                Search Cars
              </Button>
            </motion.div>
          )}

          {mode === "sell" && (
            <motion.div
              key="sell"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="mb-5 text-sm text-muted-foreground">
                Tell us about your vehicle and get a fair valuation from our Darwin team.
              </p>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="sell-make">Make</Label>
                  <Input
                    id="sell-make"
                    placeholder="e.g. Toyota"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sell-model">Model</Label>
                  <Input
                    id="sell-model"
                    placeholder="e.g. Hilux"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sell-year">Year</Label>
                  <Input
                    id="sell-year"
                    type="number"
                    placeholder="e.g. 2020"
                    value={sellYear}
                    onChange={(e) => setSellYear(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sell-mileage">Odometer (km)</Label>
                  <Input
                    id="sell-mileage"
                    type="number"
                    placeholder="e.g. 85000"
                    value={sellMileage}
                    onChange={(e) => setSellMileage(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <Button size="lg" className="w-full min-w-[200px] sm:w-auto" onClick={handleSellSearch}>
                <BadgeDollarSign className="h-5 w-5" />
                Get a Valuation
              </Button>
            </motion.div>
          )}

          {mode === "rent" && (
            <motion.div
              key="rent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <p className="mb-5 text-sm text-muted-foreground">
                Daily, weekly, and monthly rentals — sedans, SUVs, utes, and vans available in Darwin.
              </p>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rent-type">Vehicle Type</Label>
                  <Select value={rentalType} onValueChange={setRentalType}>
                    <SelectTrigger id="rent-type" className="mt-1.5">
                      <SelectValue placeholder="Any vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {rentalTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rent-location">Pick-up Location</Label>
                  <Select value={rentalLocation} onValueChange={setRentalLocation}>
                    <SelectTrigger id="rent-location" className="mt-1.5">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Darwin, NT">Darwin, NT</SelectItem>
                      <SelectItem value="Palmerston, NT">Palmerston, NT</SelectItem>
                      <SelectItem value="Darwin Airport">Darwin Airport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button size="lg" className={cn("w-full min-w-[200px] sm:w-auto")} onClick={handleRentSearch}>
                <KeyRound className="h-5 w-5" />
                Search Rentals
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
