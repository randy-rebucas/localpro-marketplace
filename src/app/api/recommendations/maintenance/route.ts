import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { jobRepository } from "@/repositories/job.repository";
import { getNextDueDate, MAINTENANCE_SCHEDULE } from "@/lib/recommendations";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`recommendations:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const categoryHistory = await jobRepository.findLastCompletedByCategory(user.userId);

  const now = Date.now();
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

  const items = categoryHistory
    .filter((h) => {
      // Only include categories that have a maintenance schedule
      const hasSchedule =
        MAINTENANCE_SCHEDULE[h.category] ??
        MAINTENANCE_SCHEDULE[
          Object.keys(MAINTENANCE_SCHEDULE).find(
            (k) => k.toLowerCase() === h.category.toLowerCase()
          ) ?? ""
        ];
      return !!hasSchedule;
    })
    .map((h) => {
      const nextDueDate = getNextDueDate(h.category, new Date(h.completedAt));
      if (!nextDueDate) return null;

      const daysUntilDue = Math.ceil((nextDueDate.getTime() - now) / 86_400_000);
      const overdue = nextDueDate.getTime() < now;
      const upcoming = !overdue && nextDueDate.getTime() - now <= SIXTY_DAYS_MS;

      if (!overdue && !upcoming) return null; // too far away to show

      return {
        category: h.category,
        lastJobDate: new Date(h.completedAt).toISOString(),
        nextDueDate: nextDueDate.toISOString(),
        overdue,
        daysUntilDue,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Overdue first, then soonest
      if (a!.overdue !== b!.overdue) return a!.overdue ? -1 : 1;
      return a!.daysUntilDue - b!.daysUntilDue;
    });

  return NextResponse.json({ items });
});
