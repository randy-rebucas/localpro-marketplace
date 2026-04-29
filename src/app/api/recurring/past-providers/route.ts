import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { jobRepository } from "@/repositories/job.repository";

/**
 * GET /api/recurring/past-providers
 * Returns unique providers this client has previously hired (completed jobs).
 * Used to populate the optional preferred-provider picker in CreateRecurringForm.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`recurring-past-prov:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (user.role !== "client") {
    return NextResponse.json({ providers: [] });
  }

  const providers = await jobRepository.findPastProviders(user.userId);
  return NextResponse.json({ providers });
});
