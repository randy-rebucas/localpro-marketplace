import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminService } from "@/services";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const ApproveSchema = z.object({
  riskScore: z.number().min(0).max(100).optional(),
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const job = await adminService.approveJob(user.userId, id, parsed.data.riskScore);
  return NextResponse.json({ job, message: "Job approved and published" });
});
