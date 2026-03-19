import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoRepository } from "@/repositories/peso.repository";

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

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { searchParams } = new URL(req.url);
  const barangay = searchParams.get("barangay") ?? undefined;
  const skill = searchParams.get("skill") ?? undefined;
  const verificationTag = searchParams.get("verificationTag") ?? undefined;
  const minRating = searchParams.get("minRating")
    ? Number(searchParams.get("minRating"))
    : undefined;

  const result = await pesoRepository.getProviderRegistry({
    barangay,
    skill,
    verificationTag,
    minRating,
    page: 1,
    limit: MAX_EXPORT,
  });

  // ── Build CSV ────────────────────────────────────────────────────────────
  const header = csvRow([
    "name",
    "email",
    "barangay",
    "skills",
    "verification_tags",
    "avg_rating",
    "completed_jobs",
    "certified",
    "livelihood_program",
    "account_subtype",
  ]);

  const dataRows = result.data.map((entry) => {
    const skillNames = entry.skills.map((s) => s.skill).join("|");
    const tags = entry.pesoVerificationTags.join("|");

    return csvRow([
      entry.name,
      entry.email,
      entry.barangay ?? "",
      skillNames,
      tags,
      entry.avgRating,
      entry.completedJobCount,
      entry.isLocalProCertified ? "yes" : "no",
      entry.livelihoodProgram ?? "",
      entry.accountSubtype,
    ]);
  });

  const csv = [header, ...dataRows].join("\n");

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
