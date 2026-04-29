import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoRepository } from "@/repositories/peso.repository";

function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

const MAX_EXPORT = 5_000;

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-wf-export:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const barangay        = searchParams.get("barangay")        ?? undefined;
  const skill           = searchParams.get("skill")           ?? undefined;
  const verificationTag = searchParams.get("verificationTag") ?? undefined;
  const rawMinRating    = searchParams.get("minRating");
  const minRating       = rawMinRating !== null
    ? (isNaN(Number(rawMinRating)) ? undefined : Math.max(0, Math.min(5, Number(rawMinRating))))
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
