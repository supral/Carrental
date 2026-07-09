"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { RENTAL_LOCATIONS } from "@/lib/rentals/locations";
import { getGoogleMapsPlaces, useGoogleMapsScript } from "@/hooks/use-google-maps";
import { cn } from "@/lib/utils";

interface LocationAutocompleteProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}

export default function LocationAutocomplete({
  id,
  label,
  value,
  onChange,
  error,
  placeholder = "Search address with Google Maps",
  required,
}: LocationAutocompleteProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showFallback, setShowFallback] = useState(false);
  const { state: mapsState, error: mapsError } = useGoogleMapsScript();

  const googleActive = mapsState === "ready";

  const filteredSuggestions = RENTAL_LOCATIONS.filter((location) => {
    const query = value.trim().toLowerCase();
    if (!query) return true;
    return (
      location.label.toLowerCase().includes(query) ||
      location.address.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (!googleActive || !inputRef.current) return;

    const googleMaps = getGoogleMapsPlaces();
    if (!googleMaps?.maps?.places) return;

    const instance = new googleMaps.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "au" },
      fields: ["formatted_address", "geometry", "name"],
    });

    const listener = instance.addListener("place_changed", () => {
      const place = instance.getPlace();
      if (place?.formatted_address) {
        onChange(place.formatted_address);
        setShowFallback(false);
      }
    });

    return () => {
      googleMaps.maps.event.removeListener(listener);
    };
  }, [googleActive, onChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowFallback(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>

      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!googleActive) setShowFallback(true);
          }}
          onFocus={() => {
            if (!googleActive) setShowFallback(true);
          }}
          placeholder={
            googleActive
              ? placeholder
              : "Type address or pick from suggestions below"
          }
          required={required}
          autoComplete="off"
          className={cn(
            "w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20",
            error ? "border-destructive" : "border-gray-300"
          )}
        />
      </div>

      {googleActive && (
        <p className="mt-1 text-xs text-gray-500">Powered by Google Maps — start typing to search addresses</p>
      )}

      {mapsState === "missing-key" && (
        <p className="mt-1 text-xs text-amber-600">
          Add <code className="rounded bg-amber-50 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable Google Maps search.
        </p>
      )}

      {mapsError && <p className="mt-1 text-xs text-primary">{mapsError}</p>}

      {!googleActive && showFallback && filteredSuggestions.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {filteredSuggestions.map((location) => (
            <li key={location.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(location.address);
                  setShowFallback(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50"
              >
                <p className="text-sm font-medium text-gray-900">{location.label}</p>
                <p className="text-xs text-gray-500">{location.address}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1.5 text-xs text-primary">{error}</p>}
    </div>
  );
}
