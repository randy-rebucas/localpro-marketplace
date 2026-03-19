import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";

/** Escape a CSV cell: wrap in quotes if it contains a comma, quote, or newline. */
function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

const MAX_EXPORT = 5_000;

/**
 * GET /api/peso/export
 *
 * Full workforce registry CSV export for PESO officers.
 * Includes provider profile details joined with user account info.
 */
export const GET = withHandler(async (_req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  await connectDB();

  const providers = await ProviderProfile.find({})
    .populate("userId", "name email phone")
    .limit(MAX_EXPORT)
    .lean();

  const headers = csvRow([
    "Name",
    "Email",
    "Phone",
    "Skills",
    "Years Experience",
    "Hourly Rate Range",
    "Availability Status",
    "Service Areas",
    "Avg Rating",
    "Completed Jobs",
    "Completion Rate",
    "Barangay",
    "Verification Tags",
    "LocalPro Certified",
    "Livelihood Program",
    "Account Subtype",
    "Created At",
  ]);

  const dataRows = providers.map((p) => {
    const u = p.userId as unknown as {
      name?: string;
      email?: string;
      phone?: string;
    } | null;

    const skills = Array.isArray(p.skills)
      ? p.skills.map((s: { skill: string }) => s.skill).join("; ")
      : "";

    const hourlyRates = Array.isArray(p.skills)
      ? p.skills
          .map((s: { hourlyRate?: string }) => s.hourlyRate || "")
          .filter(Boolean)
          .join("; ")
      : "";

    const serviceAreas = Array.isArray(p.serviceAreas)
      ? p.serviceAreas.map((a: { label: string }) => a.label).join("; ")
      : "";

    const tags = Array.isArray(p.pesoVerificationTags)
      ? p.pesoVerificationTags.join("; ")
      : "";

    return csvRow([
      u?.name ?? "",
      u?.email ?? "",
      u?.phone ?? "",
      skills,
      p.yearsExperience ?? 0,
      hourlyRates,
      p.availabilityStatus ?? "available",
      serviceAreas,
      p.avgRating ?? 0,
      p.completedJobCount ?? 0,
      p.completionRate ?? 0,
      p.barangay ?? "",
      tags,
      p.isLocalProCertified ? "yes" : "no",
      p.livelihoodProgram ?? "",
      p.accountSubtype ?? "standard",
      p.createdAt
        ? new Date(p.createdAt as unknown as string).toISOString().split("T")[0]
        : "",
    ]);
  });

  const csv = [headers, ...dataRows].join("\n");

  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `workforce-registry-${dateSlug}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
