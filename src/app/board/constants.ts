// ─── Board Constants ──────────────────────────────────────────────────────────

export const CITY = process.env.NEXT_PUBLIC_BOARD_CITY ?? "Your City";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";
export const PROVIDER_SIGNUP_URL = `${APP_URL}/register?role=provider`;

export const JOBS_PER_PAGE = 8;
export const JOB_PAGE_INTERVAL_MS = 12_000; // paginate jobs every 12s
export const DATA_REFRESH_MS = 60_000;      // re-fetch board data every 60s

export const ANNOUNCEMENT_COLORS: Record<string, string> = {
  info:    "border-sky-400 bg-sky-500/20 text-sky-200",
  success: "border-emerald-400 bg-emerald-500/20 text-emerald-200",
  warning: "border-amber-400 bg-amber-500/20 text-amber-200",
  danger:  "border-red-400 bg-red-500/20 text-red-200",
};

export const RANK_MEDAL = ["🥇", "🥈", "🥉", "4.", "5."];

// Fallback icon mapping (API provides the icon; this is used only if icon is empty)
export const ACTIVITY_ICONS: Record<string, string> = {
  plumbing:   "🔧",
  cleaning:   "🧹",
  electrical: "⚡",
  appliance:  "🛠",
  default:    "🔔",
};

export const EARNING_SAMPLES = [
  // Home & Building
  { service: "Plumbing",                   icon: "🔧", avgJob: 1_200, jobsPerWeek: 5 },
  { service: "Electrical",                 icon: "⚡", avgJob: 1_500, jobsPerWeek: 4 },
  { service: "Cleaning",                   icon: "🧹", avgJob:   800, jobsPerWeek: 6 },
  { service: "Landscaping",                icon: "🌿", avgJob:   900, jobsPerWeek: 5 },
  { service: "Carpentry",                  icon: "🪚", avgJob: 1_300, jobsPerWeek: 4 },
  { service: "Painting",                   icon: "🎨", avgJob: 1_000, jobsPerWeek: 5 },
  { service: "Roofing",                    icon: "🏠", avgJob: 2_500, jobsPerWeek: 3 },
  { service: "HVAC",                       icon: "❄️", avgJob: 1_800, jobsPerWeek: 4 },
  { service: "Moving",                     icon: "📦", avgJob: 1_200, jobsPerWeek: 5 },
  { service: "Handyman",                   icon: "🛠️", avgJob:   900, jobsPerWeek: 6 },
  { service: "Masonry & Tiling",           icon: "🧱", avgJob: 1_600, jobsPerWeek: 4 },
  { service: "Welding & Fabrication",      icon: "🔩", avgJob: 1_700, jobsPerWeek: 4 },
  // Mechanical & Automotive
  { service: "Automotive & Mechanics",     icon: "🚗", avgJob: 1_400, jobsPerWeek: 5 },
  { service: "Mechanical & Industrial",    icon: "⚙️", avgJob: 2_000, jobsPerWeek: 4 },
  // Technology
  { service: "IT & Technology",            icon: "💻", avgJob: 1_500, jobsPerWeek: 5 },
  { service: "Electronics & Telecom",      icon: "📡", avgJob: 1_200, jobsPerWeek: 5 },
  // Food & Service
  { service: "Food & Culinary",            icon: "🍳", avgJob:   800, jobsPerWeek: 6 },
  { service: "Tailoring & Fashion",        icon: "🪡", avgJob:   700, jobsPerWeek: 6 },
  // Transportation
  { service: "Transportation & Logistics", icon: "🚚", avgJob: 1_100, jobsPerWeek: 6 },
  // Health & Safety
  { service: "Health & Medical",           icon: "🏥", avgJob: 1_800, jobsPerWeek: 4 },
  { service: "Safety & Security",          icon: "🦺", avgJob: 1_300, jobsPerWeek: 5 },
  // Beauty & Personal Care
  { service: "Beauty & Personal Care",     icon: "💅", avgJob:   600, jobsPerWeek: 7 },
  // Pet
  { service: "Pet Care & Grooming",        icon: "🐾", avgJob:   700, jobsPerWeek: 6 },
];

export const PRICE_HIGHLIGHTS = EARNING_SAMPLES.slice(0, 6);
export const PLATFORM_PARTNERS = ["GCash", "Maya", "PayMongo", "PayPal", "Grab"];
