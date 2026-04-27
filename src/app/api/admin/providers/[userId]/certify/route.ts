import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { providerProfileRepository } from "@/repositories";
import { assertObjectId } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
const Schema = z.object({
  certified: z.boolean(),
});

type Ctx = { params: Promise<{ userId: string }> };

/**
 * PATCH /api/admin/providers/:userId/certify
 * Grant or revoke the "LocalPro Certified" badge for a provider.
 * Admin/staff only.
 */
export const PATCH = withHandler(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUser();
  requireRole(user, "admin", "staff");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { userId } = await params;
  assertObjectId(userId, "userId");
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 422 });
  }

  await connectDB();
  await providerProfileRepository.setCertification(userId, parsed.data.certified);

  return Response.json({
    message: parsed.data.certified
      ? "LocalPro Certified badge granted"
      : "LocalPro Certified badge revoked",
  });
});
