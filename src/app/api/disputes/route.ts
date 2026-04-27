import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { disputeService } from "@/services";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

const CLOUDINARY_URL_RE = /^https:\/\/res\.cloudinary\.com\//;

const CreateDisputeSchema = z.object({
  jobId: z.string().refine((v) => isValidObjectId(v), { message: "jobId must be a valid ObjectId" }),
  reason: z.string().min(20),
  evidence: z
    .array(
      z.string().url("Invalid evidence URL").refine(
        (u) => CLOUDINARY_URL_RE.test(u),
        "Evidence URLs must be Cloudinary URLs"
      )
    )
    .max(5)
    .optional(),
});

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`disputes-get:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const disputes = await disputeService.listDisputes(user);
  return NextResponse.json(disputes);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCsrfToken(req, user);

  const rl = await checkRateLimit(`disputes-post:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const parsed = CreateDisputeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const dispute = await disputeService.openDispute(user, parsed.data);
  return NextResponse.json(dispute, { status: 201 });
});
