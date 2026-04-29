"use client";

import { useEffect, useRef, useState } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { MapPin, Loader2, Search } from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

let mapsScriptPromise: Promise<void> | null = null;

function loadMapsScript(): Promise<void> {
  if (mapsScriptPromise) return mapsScriptPromise;
  mapsScriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("SSR")); return; }
    if (window.google?.maps?.places) { resolve(); return; }
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.dataset.googleMaps = "1";
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return mapsScriptPromise;
}

interface Props {
  initialValue: string;
  onSelect: (label: string) => void;
}

function CityAutocomplete({ initialValue, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ["(cities)"],
      componentRestrictions: { country: "ph" },
    },
    debounce: 250,
    defaultValue: initialValue,
  });

  const results = status === "OK" ? data : [];

  useEffect(() => {
    setActiveIdx(-1);
  }, [data]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        clearSuggestions();
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [clearSuggestions]);

  function selectSuggestion(idx: number) {
    const item = results[idx];
    if (!item) return;
    const main = item.structured_formatting.main_text;
    const secondary = item.structured_formatting.secondary_text;
    const province = secondary.split(",")[0]?.trim() ?? "";
    const label = province && province.toLowerCase() !== "philippines" ? `${main}, ${province}` : main;
    setValue(label, false);
    clearSuggestions();
    setOpen(false);
    onSelect(label);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0) selectSuggestion(activeIdx);
    } else if (e.key === "Escape") {
      setOpen(false);
      clearSuggestions();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={ready ? "Search city or municipality…" : "Loading Places…"}
          disabled={!ready}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => value.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-[#0a2540] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary disabled:opacity-60"
        />
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-[200] mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg overflow-hidden"
        >
          {results.map((item, idx) => {
            const main = item.structured_formatting.main_text;
            const secondary = item.structured_formatting.secondary_text;
            return (
              <li key={item.place_id} role="option" aria-selected={idx === activeIdx}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(idx); }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    idx === activeIdx ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800 truncate">{main}</span>
                    <span className="block text-xs text-slate-400 truncate">{secondary}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && status === "ZERO_RESULTS" && value.length > 1 && (
        <div className="absolute z-[200] mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400 shadow-lg">
          No cities found. Try a different spelling.
        </div>
      )}
    </div>
  );
}

function PlainInput({ initialValue, onSelect }: Props) {
  const [val, setVal] = useState(initialValue);
  useEffect(() => { setVal(initialValue); }, [initialValue]);
  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          onSelect(e.target.value);
        }}
        placeholder="e.g. Baybay City, Leyte"
        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-[#0a2540] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
      />
    </div>
  );
}

export default function LocationPickerInput({ initialValue, onSelect }: Props) {
  const [mapsReady, setMapsReady] = useState(
    typeof window !== "undefined" && !!window.google?.maps?.places
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mapsReady || !API_KEY) return;
    setLoading(true);
    loadMapsScript()
      .then(() => setMapsReady(true))
      .catch(() => {/* fall back to plain input */})
      .finally(() => setLoading(false));
  }, [mapsReady]);

  if (!API_KEY) return <PlainInput initialValue={initialValue} onSelect={onSelect} />;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        Loading location search…
      </div>
    );
  }

  if (!mapsReady) return <PlainInput initialValue={initialValue} onSelect={onSelect} />;
  return <CityAutocomplete initialValue={initialValue} onSelect={onSelect} />;
}
