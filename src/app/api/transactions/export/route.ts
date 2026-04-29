import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import { checkRateLimit } from "@/lib/rateLimit";
import type { ITransaction } from "@/types";

const EXPORT_LIMIT = 5_000;

function csvCell(value: string): string {
  const s = String(value);
  // Prefix formula triggers to prevent spreadsheet formula injection
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`tx-export:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const transactions = await Transaction.find({ payeeId: user.userId })
    .sort({ createdAt: -1 })
    .limit(EXPORT_LIMIT)
    .populate("jobId", "title")
    .lean() as unknown as (ITransaction & { jobId: { title: string } })[];

  const header = ["Date", "Job Title", "Status", "Gross (PHP)", "Commission (PHP)", "Net (PHP)"];

  const rows = transactions.map((t) => [
    new Date(t.createdAt).toLocaleDateString("en-PH"),
    t.jobId?.title ?? t.jobId?.toString() ?? "—",
    t.status,
    t.amount.toFixed(2),
    t.commission.toFixed(2),
    t.netAmount.toFixed(2),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="earnings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
