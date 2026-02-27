import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { disputeService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const CreateDisputeSchema = z.object({
  jobId: z.string().min(1),
  reason: z.string().min(20),
  evidence: z.array(z.string().url()).max(5).optional(),
});

export const GET = withHandler(async () => {
  const user = await requireUser();
  const disputes = await disputeService.listDisputes(user);
  return NextResponse.json(disputes);
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const body = await req.json();
  const parsed = CreateDisputeSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const dispute = await disputeService.openDispute(user, parsed.data);
  return NextResponse.json(dispute, { status: 201 });
});
