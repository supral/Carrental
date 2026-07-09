"use client";

import { useEffect, useState } from "react";

const SCRIPT_ID = "google-maps-places";

export type GoogleMapsLoadState = "idle" | "loading" | "ready" | "missing-key" | "error";

export function useGoogleMapsScript(): { state: GoogleMapsLoadState; error: string | null } {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [state, setState] = useState<GoogleMapsLoadState>(() =>
    apiKey ? "idle" : "missing-key"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) {
      setState("missing-key");
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") {
      setState("ready");
      return;
    }

    if (existing) {
      existing.addEventListener("load", () => setState("ready"));
      existing.addEventListener("error", () => {
        setState("error");
        setError("Failed to load Google Maps");
      });
      return;
    }

    setState("loading");

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.loaded = "false";

    script.onload = () => {
      script.dataset.loaded = "true";
      setState("ready");
    };

    script.onerror = () => {
      setState("error");
      setError("Failed to load Google Maps. Check your API key.");
    };

    document.head.appendChild(script);
  }, [apiKey]);

  return { state, error };
}

export function getGoogleMapsPlaces() {
  return (
    window as unknown as {
      google?: {
        maps: {
          places: {
            Autocomplete: new (el: HTMLInputElement, opts: object) => {
              getPlace: () => { formatted_address?: string };
              addListener: (event: string, handler: () => void) => unknown;
            };
          };
          event: { removeListener: (listener: unknown) => void };
        };
      };
    }
  ).google;
}
