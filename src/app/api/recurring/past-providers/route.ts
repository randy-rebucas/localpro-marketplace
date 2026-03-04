import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { jobRepository } from "@/repositories/job.repository";

/**
 * GET /api/recurring/past-providers
 * Returns unique providers this client has previously hired (completed jobs).
 * Used to populate the optional preferred-provider picker in CreateRecurringForm.
 */
export const GET = withHandler(async () => {
  const user = await requireUser();
  if (user.role !== "client") {
    return NextResponse.json({ providers: [] });
  }

  const providers = await jobRepository.findPastProviders(user.userId);
  return NextResponse.json({ providers });
});
