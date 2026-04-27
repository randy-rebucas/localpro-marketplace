import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { pesoService } from "@/services/peso.service";

const PostJobSchema = z.object({
  category:            z.string().min(1, "Category is required"),
  title:               z.string().min(5).max(200),
  description:         z.string().min(20),
  budget:              z.number().nonnegative().optional(),
  location:            z.string().min(1, "Location is required"),
  scheduleDate:        z.string().optional(),
  specialInstructions: z.string().optional(),
  jobTags:             z.array(z.enum(["peso", "lgu_project", "gov_program", "emergency", "internship"])).optional(),
  isPriority:          z.boolean().optional(),
  jobSource:           z.enum(["peso", "lgu"]).optional(),
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-jobs-get:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const result = await pesoService.listPesoJobs(user.userId, page, limit);
  return NextResponse.json(result);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const rl = await checkRateLimit(`peso-jobs-post:${user.userId}`, { windowMs: 3_600_000, max: 50 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = PostJobSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  // Apply sensible defaults for optional gov-job fields
  const dto = {
    ...parsed.data,
    budget:       parsed.data.budget ?? 0,
    scheduleDate: parsed.data.scheduleDate || new Date().toISOString(),
  };

  const job = await pesoService.postJob(user.userId, dto);
  return NextResponse.json(job, { status: 201 });
});
