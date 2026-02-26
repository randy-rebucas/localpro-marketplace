import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("Not authenticated", 401);

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const filter: Record<string, string> =
      user.role === "client"
        ? { payerId: user.userId }
        : user.role === "provider"
        ? { payeeId: user.userId }
        : {};

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("jobId", "title")
        .populate("payerId", "name")
        .populate("payeeId", "name")
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[TRANSACTIONS GET]", err);
    return apiError("Internal server error", 500);
  }
}
