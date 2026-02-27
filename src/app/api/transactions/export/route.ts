import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import type { ITransaction, IJob } from "@/types";

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "provider");

  await connectDB();

  const transactions = await Transaction.find({ payeeId: user.userId })
    .sort({ createdAt: -1 })
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
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="earnings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
