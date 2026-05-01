/**
 * Shared policy citations and appeal paths for enforcement-adjacent messaging.
 * Login suspension applies to all roles; provider dashboard warnings cite provider terms.
 */

export const DISCIPLINARY_SUPPORT_EMAIL = "support@localpro.asia";

export const POLICY_LINK_TERMS_TERMINATION = {
  label: "Terms of Service — Termination",
  href: "/terms#termination",
} as const;

export const POLICY_LINK_PROVIDER_SUSPENSION = {
  label: "Provider Agreement — Section 10 (Account Suspension & Termination)",
  href: "/provider-agreement#suspension",
} as const;

export const POLICY_LINK_CLIENT_SUSPENSION = {
  label: "Client Agreement — Section 10 (Account Suspension & Termination)",
  href: "/client-agreement#suspension",
} as const;

/** Policies shown when login is blocked due to suspension (role may be unknown). */
export const SUSPENDED_ACCOUNT_POLICY_LINKS = [
  POLICY_LINK_TERMS_TERMINATION,
  POLICY_LINK_PROVIDER_SUSPENSION,
  POLICY_LINK_CLIENT_SUSPENSION,
] as const;

/** Policies cited on the provider dashboard performance warning. */
export const PROVIDER_PERFORMANCE_POLICY_LINKS = [
  POLICY_LINK_TERMS_TERMINATION,
  POLICY_LINK_PROVIDER_SUSPENSION,
] as const;

export function isSuspendedAuthMessage(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("suspend");
}

export interface ProviderPerformanceEvidenceParams {
  avgRating: number;
  reviewCount: number;
  completionRate: number;
  completedJobCount: number;
  trigger: "rating" | "completion";
}

/** Quantitative evidence lines for the dashboard risk banner (not a formal sanction). */
export function buildProviderPerformanceEvidenceLines(p: ProviderPerformanceEvidenceParams): string[] {
  if (p.trigger === "rating" && p.avgRating > 0) {
    return [
      `Measured overall rating ${p.avgRating.toFixed(1)}★ from ${p.reviewCount} review${p.reviewCount === 1 ? "" : "s"}.`,
      "Marketplace expectation referenced in dashboard messaging: aim for 3.5★ or higher where reviews exist.",
    ];
  }
  return [
    `Measured completion rate ${p.completionRate}% across ${p.completedJobCount} completed job${p.completedJobCount === 1 ? "" : "s"}.`,
    "Marketplace expectation referenced in dashboard messaging: maintain 70% completion or higher.",
  ];
}
