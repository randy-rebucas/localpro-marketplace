import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { userRepository } from "@/repositories/user.repository";
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

const VALID_ROLES = ["client", "provider", "admin", "staff"] as const;
const MAX_EXPORT  = 10_000;

export const GET = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireCapability(admin, "manage_users");

  const { searchParams } = new URL(req.url);
  const roleParam = searchParams.get("role") ?? "all";
  const searchQuery = (searchParams.get("search") ?? "").trim();

  const filter: Record<string, unknown> =
    (VALID_ROLES as readonly string[]).includes(roleParam) && roleParam !== "all"
      ? { role: roleParam }
      : {};

  if (searchQuery) {
    const regex = { $regex: searchQuery, $options: "i" };
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  // Fetch all matching users (no pagination) — hard-capped for safety
  const { users } = await userRepository.findPaginated(filter, 1, MAX_EXPORT);

  // Batch-load provider profiles keyed by userId string
  const providerIds = users
    .filter((u) => u.role === "provider")
    .map((u) => u._id.toString());

  const profileMap = new Map<string, { skills: string[]; workExperiences: string[]; yearsExperience: number }>();
  if (providerIds.length > 0) {
    const profiles = await ProviderProfile.find(
      { userId: { $in: providerIds } },
      { userId: 1, skills: 1, workExperiences: 1, yearsExperience: 1 }
    ).lean();
    for (const p of profiles) {
      profileMap.set(
        (p.userId as { toString(): string }).toString(),
        {
          skills:          Array.isArray(p.skills)          ? p.skills          : [],
          workExperiences: Array.isArray(p.workExperiences) ? p.workExperiences : [],
          yearsExperience: p.yearsExperience ?? 0,
        }
      );
    }
  }

  // ── Build CSV ──────────────────────────────────────────────────────────────
  const header = csvRow([
    "id", "name", "email", "role",
    "verified", "suspended", "approval_status", "kyc_status",
    "phone", "dateOfBirth", "gender",
    "address1", "city", "province", "zip",
    "skills", "workExperiences", "yearsOfExperience",
    "address_count", "joined",
  ]);

  const dataRows = users.map((u) => {
    const uid     = u._id.toString();
    const addr0   = u.addresses?.[0];
    const profile = profileMap.get(uid);
    const dob     = u.dateOfBirth
      ? (u.dateOfBirth instanceof Date
          ? u.dateOfBirth.toISOString().slice(0, 10)
          : String(u.dateOfBirth).slice(0, 10))
      : "";

    return csvRow([
      uid,
      u.name,
      u.email,
      u.role,
      u.isVerified  ? "yes" : "no",
      u.isSuspended ? "yes" : "no",
      u.approvalStatus ?? "approved",
      u.kycStatus ?? "none",
      u.phone ?? "",
      dob,
      u.gender ?? "",
      addr0?.address ?? "",
      "",
      "",
      "",
      profile?.skills.join("|")          ?? "",
      profile?.workExperiences.join("|") ?? "",
      profile?.yearsExperience ?? "",
      u.addresses?.length ?? 0,
      u.createdAt instanceof Date
        ? u.createdAt.toISOString()
        : String(u.createdAt),
    ]);
  });

  const csv = [header, ...dataRows].join("\n");

  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = roleParam === "all"
    ? `localpro-users-${dateSlug}.csv`
    : `localpro-users-${roleParam}-${dateSlug}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
});
