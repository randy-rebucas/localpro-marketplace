import { NextRequest, NextResponse } from "next/server";
import { transactionRepository } from "@/repositories";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));

  const filter: Record<string, string> =
    user.role === "client"
      ? { payerId: user.userId }
      : user.role === "provider"
      ? { payeeId: user.userId }
      : {};

  const { data, total } = await transactionRepository.findPaginatedForUser(filter, page, limit);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
