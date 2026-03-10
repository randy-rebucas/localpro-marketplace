/**
 * useGooglePlaces
 * ---------------
 * Loads the Google Maps JS API (once, shared across all uses) and attaches
 * a Places Autocomplete widget to a given input ref.
 *
 * Usage:
 *   const ref = useRef<HTMLInputElement>(null);
 *   useGooglePlaces(ref, (place) => {
 *     console.log(place.formatted_address, place.geometry?.location);
 *   });
 */

import { useEffect, useRef } from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ─── Singleton script loader ──────────────────────────────────────────────────

let scriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("SSR")); return; }
    if (window.google?.maps?.places) { resolve(); return; }

    const existing = document.querySelector('script[data-google-maps]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "1";
    script.onload  = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGooglePlaces(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onSelect: (place: google.maps.places.PlaceResult) => void,
  options?: google.maps.places.AutocompleteOptions,
) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!API_KEY) return;

    let destroyed = false;

    loadGoogleMapsScript()
      .then(() => {
        if (destroyed || !inputRef.current) return;
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "address_components", "name"],
          ...options,
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (place?.formatted_address) onSelectRef.current(place);
        });
        autocompleteRef.current = ac;
      })
      .catch(() => { /* API key missing or blocked — input still works as plain text */ });

    return () => {
      destroyed = true;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
