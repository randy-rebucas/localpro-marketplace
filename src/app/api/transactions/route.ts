import { NextRequest, NextResponse } from "next/server";
import { transactionRepository } from "@/repositories";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`transactions:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

  let filter: Record<string, string>;
  if (user.role === "client") {
    filter = { payerId: user.userId };
  } else if (user.role === "provider") {
    filter = { payeeId: user.userId };
  } else if (user.role === "admin") {
    filter = {};
  } else {
    throw new ForbiddenError("Access denied");
  }

  const { data, total } = await transactionRepository.findPaginatedForUser(filter, page, limit);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
