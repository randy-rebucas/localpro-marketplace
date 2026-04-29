"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "localpro_visitor_location_v1";
const FALLBACK = "Philippines";
const AUTO_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

type Cached = { label: string; t: number; manual?: boolean };

type VisitorLocationSnapshot = { label: string; isManual: boolean };

const SERVER_SNAPSHOT: VisitorLocationSnapshot = { label: FALLBACK, isManual: false };

function readCached(): Cached | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (typeof parsed.label !== "string" || parsed.label.length < 2) return null;
    const manual = parsed.manual === true;
    if (!manual && Date.now() - parsed.t > AUTO_CACHE_MS) return null;
    return { label: parsed.label.trim(), t: parsed.t, manual };
  } catch {
    return null;
  }
}

function persist(label: string, manual: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ label: label.trim(), t: Date.now(), manual }));
  } catch {
    /* private mode */
  }
}

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

let snapshot: VisitorLocationSnapshot = { label: FALLBACK, isManual: false };
let bootstrapStarted = false;

function commit(next: VisitorLocationSnapshot) {
  if (next.label === snapshot.label && next.isManual === snapshot.isManual) return;
  snapshot = next;
  emit();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function applyAutoLabel(next: string) {
  if (snapshot.isManual) return;
  const v = next.trim() || FALLBACK;
  commit({ label: v, isManual: false });
  persist(v, false);
}

function setUserLabel(next: string) {
  const v = next.trim() || FALLBACK;
  if (v === snapshot.label && snapshot.isManual) return;
  commit({ label: v, isManual: true });
  persist(v, true);
}

async function runAutoDetection() {
  try {
    const ipRes = await fetch("/api/visitor-location", { cache: "no-store" });
    let ipLabel = FALLBACK;
    if (ipRes.ok) {
      const j = (await ipRes.json()) as { label?: string };
      if (j.label && typeof j.label === "string") ipLabel = j.label.trim() || FALLBACK;
    }
    applyAutoLabel(ipLabel);

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const geoRes = await fetch(
            `/api/visitor-location?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
            { cache: "no-store" },
          );
          if (!geoRes.ok) return;
          const j = (await geoRes.json()) as { label?: string };
          if (j.label && typeof j.label === "string") applyAutoLabel(j.label.trim());
        } catch {
          /* keep IP */
        }
      },
      () => {
        /* denied or timeout */
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 12_000 },
    );
  } catch {
    applyAutoLabel(FALLBACK);
  }
}

function bootstrap() {
  if (bootstrapStarted) return;
  bootstrapStarted = true;

  const cached = readCached();
  if (cached) {
    commit({ label: cached.label, isManual: cached.manual === true });
  }

  void (async () => {
    if (snapshot.isManual) return;

    try {
      if (!cached) {
        await runAutoDetection();
        return;
      }

      if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const geoRes = await fetch(
              `/api/visitor-location?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
              { cache: "no-store" },
            );
            if (!geoRes.ok) return;
            const j = (await geoRes.json()) as { label?: string };
            if (j.label && typeof j.label === "string") applyAutoLabel(j.label.trim());
          } catch {
            /* keep cache */
          }
        },
        () => {
          /* denied or timeout */
        },
        { enableHighAccuracy: false, maximumAge: 300_000, timeout: 12_000 },
      );
    } catch {
      if (!cached) applyAutoLabel(FALLBACK);
    }
  })();
}

/**
 * Shared visitor location for marketing header + hero search (synced).
 * Order: cache → edge IP (if no cache) → optional GPS reverse-geocode.
 * Manual edits (setLocation) are not overwritten by IP/GPS.
 */
export function useVisitorLocation() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    bootstrap();
  }, []);

  const setLocation = useCallback((next: string) => {
    setUserLabel(next);
  }, []);

  const resetToAutomaticLocation = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode */
    }
    commit({ label: FALLBACK, isManual: false });
    await runAutoDetection();
  }, []);

  return useMemo(
    () => ({
      label: state.label,
      isManual: state.isManual,
      setLocation,
      resetToAutomaticLocation,
    }),
    [state.label, state.isManual, setLocation, resetToAutomaticLocation],
  );
}
