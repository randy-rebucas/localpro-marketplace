/**
 * Pure recommendation utilities — no DB, no AI.
 * Used for service bundle suggestions and maintenance schedule reminders.
 */

// ─── Service Bundle Map ───────────────────────────────────────────────────────

interface BundleItem {
  category: string;
  reason: string;
  icon: string;
}

export const BUNDLE_MAP: Record<string, BundleItem[]> = {
  Cleaning: [
    { category: "Pest Control", reason: "Combine for a complete home refresh", icon: "🐛" },
    { category: "HVAC",         reason: "Clean your AC filters while you're at it", icon: "❄️" },
    { category: "Painting",     reason: "Fresh paint looks best on a clean surface", icon: "🖌️" },
  ],
  "Pest Control": [
    { category: "Cleaning",     reason: "Clear up after treatment for best results", icon: "🧹" },
    { category: "HVAC",         reason: "Check vents for pest entry points too", icon: "❄️" },
  ],
  HVAC: [
    { category: "Cleaning",     reason: "Deep clean while the technician is on-site", icon: "🧹" },
    { category: "Electrical",   reason: "Service your wiring in the same visit", icon: "⚡" },
  ],
  Plumbing: [
    { category: "Masonry",      reason: "Repair tiles or walls damaged by leaks", icon: "🧱" },
    { category: "Carpentry",    reason: "Fix or replace water-damaged woodwork", icon: "🪚" },
  ],
  Electrical: [
    { category: "HVAC",         reason: "Power and cooling upgrades go hand in hand", icon: "❄️" },
    { category: "Security",     reason: "Install security systems while circuits are open", icon: "🔒" },
  ],
  Landscaping: [
    { category: "Painting",     reason: "Freshen up fences and walls after yard work", icon: "🖌️" },
    { category: "Cleaning",     reason: "Clear outdoor areas after landscaping", icon: "🧹" },
    { category: "Masonry",      reason: "Repair pathways or garden walls", icon: "🧱" },
  ],
  Painting: [
    { category: "Carpentry",    reason: "Fix surfaces before painting for best finish", icon: "🪚" },
    { category: "Cleaning",     reason: "Clean walls before applying new paint", icon: "🧹" },
  ],
  Carpentry: [
    { category: "Painting",     reason: "Paint new woodwork for a finished look", icon: "🖌️" },
    { category: "Masonry",      reason: "Pair with masonry for structural repairs", icon: "🧱" },
  ],
  Roofing: [
    { category: "Carpentry",    reason: "Address any ceiling or beam damage", icon: "🪚" },
    { category: "Electrical",   reason: "Check wiring in the roof space", icon: "⚡" },
    { category: "Painting",     reason: "Repaint after roof work is done", icon: "🖌️" },
  ],
  Masonry: [
    { category: "Painting",     reason: "Finish new masonry with a coat of paint", icon: "🖌️" },
    { category: "Plumbing",     reason: "Check pipes embedded in new concrete", icon: "🔧" },
  ],
  "Auto Mechanics": [
    { category: "Welding",      reason: "Fix structural body damage at the same time", icon: "🔩" },
    { category: "Cleaning",     reason: "Detail your vehicle after a service", icon: "🧹" },
  ],
  Security: [
    { category: "Electrical",   reason: "Ensure sufficient power for all security devices", icon: "⚡" },
    { category: "HVAC",         reason: "Protect server rooms with proper cooling", icon: "❄️" },
  ],
  IT: [
    { category: "Electrical",   reason: "Upgrade your wiring for new hardware", icon: "⚡" },
    { category: "Security",     reason: "Pair IT setup with physical security", icon: "🔒" },
  ],
  Handyman: [
    { category: "Painting",     reason: "Touch up walls after handyman work", icon: "🖌️" },
    { category: "Cleaning",     reason: "Clean up after repairs are done", icon: "🧹" },
  ],
  Moving: [
    { category: "Cleaning",     reason: "Deep clean your old or new place", icon: "🧹" },
    { category: "Carpentry",    reason: "Fix furniture or fittings during the move", icon: "🪚" },
  ],
  Salon: [
    { category: "Cleaning",     reason: "Freshen up your space after the appointment", icon: "🧹" },
  ],
};

/** Returns bundle suggestions for a given category. Empty array if none defined. */
export function getBundleSuggestions(category: string): BundleItem[] {
  // Try exact match first, then case-insensitive
  return (
    BUNDLE_MAP[category] ??
    BUNDLE_MAP[Object.keys(BUNDLE_MAP).find((k) => k.toLowerCase() === category.toLowerCase()) ?? ""] ??
    []
  );
}

// ─── Maintenance Schedule ─────────────────────────────────────────────────────

interface MaintenanceInterval {
  intervalDays: number;
  label: string;
}

export const MAINTENANCE_SCHEDULE: Record<string, MaintenanceInterval> = {
  Cleaning:       { intervalDays: 14,  label: "every 2 weeks" },
  "Pest Control": { intervalDays: 90,  label: "every 3 months" },
  HVAC:           { intervalDays: 180, label: "every 6 months" },
  Landscaping:    { intervalDays: 30,  label: "monthly" },
  Painting:       { intervalDays: 365, label: "annually" },
  Plumbing:       { intervalDays: 180, label: "every 6 months" },
  Electrical:     { intervalDays: 365, label: "annually" },
  Roofing:        { intervalDays: 365, label: "annually" },
  "Auto Mechanics": { intervalDays: 90, label: "every 3 months" },
  Security:       { intervalDays: 180, label: "every 6 months" },
};

/**
 * Returns the next recommended booking date for a category,
 * or null if the category has no maintenance schedule.
 */
export function getNextDueDate(category: string, lastJobDate: Date): Date | null {
  const schedule =
    MAINTENANCE_SCHEDULE[category] ??
    MAINTENANCE_SCHEDULE[Object.keys(MAINTENANCE_SCHEDULE).find((k) => k.toLowerCase() === category.toLowerCase()) ?? ""];

  if (!schedule) return null;

  const next = new Date(lastJobDate);
  next.setDate(next.getDate() + schedule.intervalDays);
  return next;
}

/** True when the next due date is within 7 days (or already past). */
export function isMaintenanceDue(category: string, lastJobDate: Date): boolean {
  const next = getNextDueDate(category, lastJobDate);
  if (!next) return false;
  const daysUntil = Math.ceil((next.getTime() - Date.now()) / 86_400_000);
  return daysUntil <= 7;
}

export function isMaintenanceOverdue(category: string, lastJobDate: Date): boolean {
  const next = getNextDueDate(category, lastJobDate);
  if (!next) return false;
  return next < new Date();
}

/** Returns the maintenance label for a category (e.g. "every 6 months"). */
export function getMaintenanceLabel(category: string): string | null {
  const schedule =
    MAINTENANCE_SCHEDULE[category] ??
    MAINTENANCE_SCHEDULE[Object.keys(MAINTENANCE_SCHEDULE).find((k) => k.toLowerCase() === category.toLowerCase()) ?? ""];
  return schedule?.label ?? null;
}
