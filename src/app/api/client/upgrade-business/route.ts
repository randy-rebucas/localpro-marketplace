/**
 * POST /api/client/upgrade-business
 *
 * Activates a free Business account for the authenticated client.
 * Simply flips accountType from "personal" → "business".
 * No payment required — it's free.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { userRepository } from "@/repositories/user.repository";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`upgrade-business:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (user.role !== "client") {
    throw new ForbiddenError("Only client accounts can upgrade to Business.");
  }

  const existing = await userRepository.findById(user.userId);
  if (!existing) throw new NotFoundError("User");

  if (existing.accountType === "business") {
    return NextResponse.json({ message: "Already a Business account." });
  }

  await userRepository.updateById(user.userId, { accountType: "business" });

  return NextResponse.json({ message: "Business account activated.", accountType: "business" });
});
