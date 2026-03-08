import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { pesoService } from "@/services/peso.service";

const PostJobSchema = z.object({
  category:            z.string().min(1, "Category is required"),
  title:               z.string().min(5).max(200),
  description:         z.string().min(20),
  budget:              z.number().positive(),
  location:            z.string().min(1, "Location is required"),
  scheduleDate:        z.string().min(1, "Schedule date is required"),
  specialInstructions: z.string().optional(),
  jobTags:             z.array(z.enum(["peso", "lgu_project", "gov_program", "emergency", "internship"])).optional(),
  isPriority:          z.boolean().optional(),
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const result = await pesoService.listPesoJobs(page, limit);
  return NextResponse.json(result);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const parsed = PostJobSchema.safeParse(await req.json());
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const job = await pesoService.postJob(user.userId, parsed.data);
  return NextResponse.json(job, { status: 201 });
});
