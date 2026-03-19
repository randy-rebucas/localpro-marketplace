"use client";

/**
 * StructuredAddressInput
 *
 * Two separate fields (street line + postal code) that are combined into a
 * single autocomplete query.  Suggestions come from:
 *   1. Google Places API (if the Maps script is loaded)
 *   2. Nominatim forward-geocoding (free OSM fallback)
 *
 * The parent only needs to handle the confirmed address string via `onSelect`.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface Suggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  /** Full formatted address string */
  full: string;
  /** place_id for Google, undefined for Nominatim */
  placeId?: string;
  /** For Nominatim results we pre-resolve lat/lng */
  coords?: { lat: number; lng: number };
}

// ── Nominatim forward-geocode search ─────────────────────────────────────────
async function nominatimSearch(query: string): Promise<Suggestion[]> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=5`,
      { headers: { "Accept-Language": "en", "User-Agent": "LocalPro/1.0" } }
    );
    if (!r.ok) return [];
    const data = await r.json();
    return data.map(
      (item: {
        place_id: string;
        display_name: string;
        address: { road?: string; house_number?: string; city?: string; county?: string; state?: string; country?: string };
        lat: string;
        lon: string;
      }) => {
        const a = item.address;
        const street = [a.house_number, a.road].filter(Boolean).join(" ");
        const area = [a.city ?? a.county, a.state, a.country].filter(Boolean).join(", ");
        return {
          id: String(item.place_id),
          mainText: street || item.display_name.split(",")[0],
          secondaryText: area,
          full: item.display_name,
          coords: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
        };
      }
    );
  } catch {
    return [];
  }
}

// ── Google Places variant ─────────────────────────────────────────────────────
interface GoogProps {
  street: string;
  postal: string;
  onSelect: (address: string, coords?: { lat: number; lng: number }) => void;
  confirmed: string;
}

function GoogleStructuredInput({ street: initStreet, postal: initPostal, onSelect, confirmed }: GoogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [street, setStreet] = useState(initStreet);
  const [postal, setPostal] = useState(initPostal);

  const combined = [street, postal].filter(Boolean).join(", ");

  const { value, suggestions: { status, data, loading }, setValue, clearSuggestions } =
    usePlacesAutocomplete({
      requestOptions: { types: ["address"] },
      debounce: 350,
    });

  // Sync combined query into the hook whenever street or postal changes
  useEffect(() => {
    if (combined.trim().length >= 3) {
      setValue(combined, true); // trigger fetch
    } else {
      setValue("", false);
      clearSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combined]);

  // Reset internal fields when parent clears the confirmed address
  useEffect(() => {
    if (!confirmed) {
      setStreet("");
      setPostal("");
      clearSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        clearSuggestions();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [clearSuggestions]);

  async function handleSelect(description: string, placeId: string) {
    clearSuggestions();
    onSelect(description);
    try {
      const results = await getGeocode({ placeId });
      const { lat, lng } = await getLatLng(results[0]);
      onSelect(description, { lat, lng });
    } catch { /* coords optional */ }
  }

  const hasResults = status === "OK" && data.length > 0;
  const isConfirmed = !!confirmed;

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Street + Postal fields with labels */}
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Street Address</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={street}
              onChange={(e) => {
              setStreet(e.target.value);
              if (confirmed) onSelect("");
            }}
              onKeyDown={(e) => { if (e.key === "Escape") clearSuggestions(); }}
              placeholder="e.g., 123 Main Street"
              maxLength={150}
              autoComplete="off"
              className={`w-full rounded-md border px-2.5 py-1.5 pl-8 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                isConfirmed ? "border-green-300 bg-green-50/50" : "border-slate-200"
              }`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Postal Code</label>
          <input
            type="text"
            value={postal}
            onChange={(e) => {
              setPostal(e.target.value);
              if (confirmed) onSelect("");
            }}
            placeholder="e.g., 10001"
            maxLength={20}
            autoComplete="off"
            className={`w-full rounded-md border px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
              isConfirmed ? "border-green-300 bg-green-50/50" : "border-slate-200"
            }`}
          />
        </div>
      </div>

      {/* Confirmed address display */}
      {isConfirmed && (
        <div className="flex items-start gap-1.5 rounded-md bg-green-50 border border-green-200 px-2.5 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-800 leading-snug">{confirmed}</p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && !isConfirmed && (
        <div className="flex items-center gap-1.5 px-1">
          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          <span className="text-xs text-slate-400">Finding addresses…</span>
        </div>
      )}

      {/* Suggestions dropdown */}
      {hasResults && !isConfirmed && (
        <ul className="z-50 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
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

      {/* No results hint */}
      {status === "ZERO_RESULTS" && value.length > 3 && !isConfirmed && (
        <p className="text-xs text-slate-400 px-1">No matching addresses found — try a different street or postal code.</p>
      )}

      {/* Static map preview after selection */}
      {isConfirmed && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (() => {
        // We don't store coords here; the preview is only shown in the full LocationAutocomplete
        return null;
      })()}
    </div>
  );
}

// ── Nominatim / plain fallback ────────────────────────────────────────────────
interface NomProps {
  street: string;
  postal: string;
  onSelect: (address: string, coords?: { lat: number; lng: number }) => void;
  confirmed: string;
}

function NominatimStructuredInput({ street: initStreet, postal: initPostal, onSelect, confirmed }: NomProps) {
  const [street, setStreet] = useState(initStreet);
  const [postal, setPostal] = useState(initPostal);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const combined = [street, postal].filter(Boolean).join(", ");

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 4) { setSuggestions([]); return; }
    setSearching(true);
    const results = await nominatimSearch(q);
    setSuggestions(results);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(combined), 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [combined, runSearch]);

  useEffect(() => {
    if (!confirmed) { setStreet(""); setPostal(""); setSuggestions([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setSuggestions([]);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const isConfirmed = !!confirmed;

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Street Address</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                if (confirmed) onSelect("");
              }}
              placeholder="e.g., 123 Main Street"
              maxLength={150}
              autoComplete="off"
              className={`w-full rounded-md border px-2.5 py-1.5 pl-8 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                isConfirmed ? "border-green-300 bg-green-50/50" : "border-slate-200"
              }`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Postal Code</label>
          <input
            type="text"
            value={postal}
            onChange={(e) => {
              setPostal(e.target.value);
              if (confirmed) onSelect("");
            }}
            placeholder="e.g., 10001"
            maxLength={20}
            autoComplete="off"
            className={`w-full rounded-md border px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
              isConfirmed ? "border-green-300 bg-green-50/50" : "border-slate-200"
            }`}
          />
        </div>
      </div>

      {isConfirmed && (
        <div className="flex items-start gap-1.5 rounded-md bg-green-50 border border-green-200 px-2.5 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-800 leading-snug">{confirmed}</p>
        </div>
      )}

      {searching && !isConfirmed && (
        <div className="flex items-center gap-1.5 px-1">
          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          <span className="text-xs text-slate-400">Finding addresses…</span>
        </div>
      )}

      {suggestions.length > 0 && !isConfirmed && (
        <ul className="z-50 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors"
                onClick={() => { setSuggestions([]); onSelect(s.full, s.coords); }}
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-800 truncate">{s.mainText}</span>
                  <span className="block text-xs text-slate-400 truncate">{s.secondaryText}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Smart wrapper ─────────────────────────────────────────────────────────────
interface StructuredAddressInputProps {
  /** Confirmed address value coming from the parent (controls green checkmark + reset) */
  confirmedAddress: string;
  onSelect: (address: string, coords?: { lat: number; lng: number }) => void;
}

export default function StructuredAddressInput({ confirmedAddress, onSelect }: StructuredAddressInputProps) {
  const [mapsReady, setMapsReady] = useState(
    typeof window !== "undefined" && typeof window.google !== "undefined"
  );
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState({
    street: "",
    city: "",
    state: "",
    postal: "",
  });
  const [confirmedCoords, setConfirmedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (mapsReady) return;
    const id = setInterval(() => {
      if (typeof window.google !== "undefined") { setMapsReady(true); clearInterval(id); }
    }, 200);
    const timeout = setTimeout(() => clearInterval(id), 5000);
    return () => { clearInterval(id); clearTimeout(timeout); };
  }, [mapsReady]);

  // Reset state when parent clears the confirmed address
  useEffect(() => {
    if (!confirmedAddress) {
      setConfirmedCoords(null);
      setManualAddress({ street: "", city: "", state: "", postal: "" });
      setManualMode(false);
    }
  }, [confirmedAddress]);

  function handleSelect(address: string, coords?: { lat: number; lng: number }) {
    onSelect(address, coords);
    setConfirmedCoords(coords ?? null);
  }

  function handleManualConfirm() {
    const { street, postal } = manualAddress;
    // Validate required fields
    if (!street.trim() || !postal.trim()) {
      alert("Please enter at least a street address and postal code.");
      return;
    }

    // Build formatted address
    const parts = [street, manualAddress.city, manualAddress.state, postal].filter(
      (part) => part.trim()
    );
    const fullAddress = parts.join(", ");

    // Call parent callback
    onSelect(fullAddress);

    // Reset manual mode state
    setManualAddress({ street: "", city: "", state: "", postal: "" });
  }

  function toggleManualMode(enable: boolean) {
    setManualMode(enable);
    // Clear manual address when switching away from manual mode
    if (!enable) {
      setManualAddress({ street: "", city: "", state: "", postal: "" });
    }
  }

  const isAddressConfirmed = !!confirmedAddress;

  return (
    <div className="space-y-4">
      {/* Toggle between manual and autocomplete modes */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleManualMode(false)}
          disabled={isAddressConfirmed}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !manualMode && !isAddressConfirmed
              ? "bg-primary text-white"
              : isAddressConfirmed
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          Use Autocomplete
        </button>
        <button
          type="button"
          onClick={() => toggleManualMode(true)}
          disabled={isAddressConfirmed}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            manualMode && !isAddressConfirmed
              ? "bg-primary text-white"
              : isAddressConfirmed
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          Enter Manually
        </button>
      </div>

      {/* Address confirmed display */}
      {isAddressConfirmed && (
        <div className="flex items-start gap-1.5 rounded-md bg-green-50 border border-green-200 px-2.5 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-800 leading-snug">{confirmedAddress}</p>
        </div>
      )}

      {manualMode && !isAddressConfirmed ? (
        <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/30">
          {/* Manual Address Input Fields */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={manualAddress.street}
                onChange={(e) => setManualAddress({ ...manualAddress, street: e.target.value })}
                placeholder="e.g., 123 Main Street"
                maxLength={150}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 pl-8 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                City
              </label>
              <input
                type="text"
                value={manualAddress.city}
                onChange={(e) => setManualAddress({ ...manualAddress, city: e.target.value })}
                placeholder="e.g., New York"
                maxLength={100}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                State / Province
              </label>
              <input
                type="text"
                value={manualAddress.state}
                onChange={(e) => setManualAddress({ ...manualAddress, state: e.target.value })}
                placeholder="e.g., NY or ON"
                maxLength={100}
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Postal Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={manualAddress.postal}
              onChange={(e) => setManualAddress({ ...manualAddress, postal: e.target.value })}
              placeholder="e.g., 10001"
              maxLength={20}
              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleManualConfirm}
            className="w-full mt-4 px-4 py-2.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Confirm Address
          </button>
        </div>
      ) : !isAddressConfirmed ? (
        <>
          {mapsReady ? (
            <GoogleStructuredInput
              street=""
              postal=""
              onSelect={handleSelect}
              confirmed={confirmedAddress}
            />
          ) : (
            <NominatimStructuredInput
              street=""
              postal=""
              onSelect={handleSelect}
              confirmed={confirmedAddress}
            />
          )}
        </>
      ) : null}

      {/* Static map preview */}
      {confirmedCoords && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <Image
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${confirmedCoords.lat},${confirmedCoords.lng}&zoom=17&size=640x160&markers=color:red%7C${confirmedCoords.lat},${confirmedCoords.lng}&scale=2&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
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
              {confirmedCoords.lat.toFixed(5)}, {confirmedCoords.lng.toFixed(5)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
