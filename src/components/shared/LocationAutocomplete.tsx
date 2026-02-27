"use client";

import { useRef, useEffect, useState } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin, X, Loader2 } from "lucide-react";
import Image from "next/image";

interface Props {
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

// ── Plain input fallback (no API key configured) ─────────────────────────────
function PlainLocationInput({ value, onChange, placeholder, error, className = "" }: Props) {
  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        type="text"
        className={`input w-full pl-9 ${error ? "border-red-400" : ""} ${className}`}
        placeholder={placeholder ?? "e.g. 123 Main St, Manila"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}

// ── Autocomplete (Google Maps loaded) ────────────────────────────────────────
function AutocompleteInput({ value, onChange, placeholder, error, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    ready,
    value: inputValue,
    suggestions: { status, data, loading },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ["address"],
    },
    debounce: 300,
    defaultValue: value,
  });

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Keep internal value in sync when parent resets the form
  useEffect(() => {
    if (value !== inputValue) setValue(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearSuggestions();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [clearSuggestions]);

  async function handleSelect(description: string, placeId: string) {
    setValue(description, false);
    clearSuggestions();
    onChange(description);

    try {
      // Use place_id (more precise than geocoding by address string)
      const results = await getGeocode({ placeId });
      const { lat, lng } = await getLatLng(results[0]);
      setCoords({ lat, lng });
      onChange(description, { lat, lng });
    } catch {
      // coords are optional — silently ignore
    }
  }

  function handleClear() {
    setValue("", false);
    clearSuggestions();
    setCoords(null);
    onChange("");
  }

  const hasResults = status === "OK" && data.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {/* Pin icon */}
        <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

        <input
          type="text"
          className={`input w-full pl-9 pr-9 ${error ? "border-red-400" : ""} ${className}`}
          placeholder={ready ? placeholder : "Loading…"}
          disabled={!ready}
          value={inputValue}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value); // keep parent state live
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") clearSuggestions();
          }}
          autoComplete="off"
        />

        {/* Right icon — spinner while loading, clear button when has value */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : inputValue ? (
            <button type="button" onClick={handleClear} tabIndex={-1}
              className="text-slate-400 hover:text-slate-600 focus:outline-none">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </span>
      </div>

      {/* Suggestions dropdown */}
      {hasResults && (
        <ul className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {data.map(({ place_id, description, structured_formatting }) => (
            <li key={place_id}>
              <button
                type="button"
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors"
                onClick={() => handleSelect(description, place_id)}
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800 truncate">
                    {structured_formatting.main_text}
                  </span>
                  <span className="block text-xs text-slate-400 truncate">
                    {structured_formatting.secondary_text}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* "no results" hint when user typed something but got nothing */}
      {status === "ZERO_RESULTS" && inputValue.length > 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 shadow-lg">
          No matching addresses found.
        </div>
      )}

      {/* Static map pin preview — only shown after a suggestion is confirmed */}
      {coords && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <Image
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=16&size=640x180&markers=color:red%7Clabel:P%7C${coords.lat},${coords.lng}&scale=2&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
            alt="Selected location"
            width={640}
            height={160}
            className="w-full h-[160px] object-cover"
          />
          <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
              <MapPin className="h-3.5 w-3.5 text-green-500" />
              Location pinned
            </span>
            <span className="font-mono text-xs text-slate-400">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Smart wrapper — picks the right variant ───────────────────────────────────
export default function LocationAutocomplete(props: Props) {
  const [mapsReady, setMapsReady] = useState(
    typeof window !== "undefined" && typeof window.google !== "undefined"
  );

  useEffect(() => {
    if (mapsReady) return;
    // Poll briefly in case the script loads slightly after component mount
    const id = setInterval(() => {
      if (typeof window.google !== "undefined") {
        setMapsReady(true);
        clearInterval(id);
      }
    }, 200);
    const timeout = setTimeout(() => clearInterval(id), 5000);
    return () => { clearInterval(id); clearTimeout(timeout); };
  }, [mapsReady]);

  if (!mapsReady) return <PlainLocationInput {...props} />;
  return <AutocompleteInput {...props} />;
}
