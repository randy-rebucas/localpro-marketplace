import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

const NOMINATIM_UA = "LocalPro/1.0 (https://www.localpro.asia; support@localpro.asia)";
const NOMINATIM_TIMEOUT_MS = 5_000;

function labelFromEdgeHeaders(req: NextRequest): string {
  const h = req.headers;
  const cityRaw = h.get("x-vercel-ip-city") || h.get("cf-ipcity") || "";
  const region = h.get("x-vercel-ip-country-region") || h.get("cf-region-code") || "";
  const country = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "PH").toUpperCase();

  // decodeURIComponent throws on malformed percent-sequences (e.g. %ZZ from rogue headers)
  let city = "";
  if (cityRaw) {
    try {
      city = decodeURIComponent(cityRaw.replace(/\+/g, " ")).trim();
    } catch {
      city = cityRaw.trim();
    }
  }

  if (city && country) return `${city}, ${country}`;
  if (region && country) return `${region}, ${country}`;
  if (country === "PH") return "Philippines";
  return country.length <= 3 ? country : `Region (${country})`;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "en" },
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
        state?: string;
        country_code?: string;
      };
    };
    const a = data.address;
    if (!a) return null;
    const place =
      a.city || a.town || a.village || a.municipality || a.county || a.state || "";
    const cc = (a.country_code || "ph").toUpperCase();
    if (place) return `${place}, ${cc}`;
    return cc ? `Near you, ${cc}` : null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /api/visitor-location — coarse location from edge (Vercel / Cloudflare) headers.
 * GET /api/visitor-location?lat=..&lon=.. — reverse-geocode (server-side Nominatim).
 */
export async function GET(req: NextRequest) {
  try {
    const lat = req.nextUrl.searchParams.get("lat");
    const lon = req.nextUrl.searchParams.get("lon");

    if (lat != null && lon != null) {
      // Rate-limit the geocoding path: Nominatim ToS requires ≤1 req/s per client
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const rl = await checkRateLimit(`geocode:${ip}`, { windowMs: 60_000, max: 20 });
      if (!rl.ok) {
        return NextResponse.json({ label: labelFromEdgeHeaders(req), source: "edge" as const });
      }

      const la = Number(lat);
      const lo = Number(lon);
      if (Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) {
        const precise = await reverseGeocode(la, lo);
        if (precise) {
          return NextResponse.json({ label: precise, source: "coordinates" as const });
        }
      }
    }

    const label = labelFromEdgeHeaders(req);
    return NextResponse.json({ label, source: "edge" as const });
  } catch {
    // Network failure, Nominatim timeout, or unexpected header error — fall back gracefully
    return NextResponse.json({ label: "Philippines", source: "edge" as const });
  }
}
