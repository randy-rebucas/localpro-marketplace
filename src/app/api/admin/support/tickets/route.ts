import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import mongoose from "mongoose";

/**
 * GET /api/admin/support/tickets
 * Returns all support tickets (admin/staff only).
 * Query params: status, priority, category, page (default 1), limit (default 30)
 *
 * PATCH /api/admin/support/tickets
 * Updates a ticket's status / priority / assignedTo.
 * Body: { ticketId, status?, priority?, assignedTo? }
 */

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_support");
  await connectDB();

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status")   ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const page     = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit    = Math.min(50, parseInt(searchParams.get("limit") ?? "30"));

  const filter: Record<string, unknown> = {};
  if (status)   filter.status   = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name email role")
      .populate("assignedTo", "name email")
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  return NextResponse.json({ tickets, total, page, limit });
});

export const PATCH = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_support");
  await connectDB();

  const body = await req.json();
  const { ticketId, status, priority, assignedTo } = body as Record<string, string>;

  if (!ticketId) {
    return NextResponse.json({ error: "ticketId required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (status)     update.status     = status;
  if (priority)   update.priority   = priority;
  if (assignedTo) update.assignedTo = new mongoose.Types.ObjectId(assignedTo);

  if (status === "resolved") update.resolvedAt = new Date();
  if (status === "closed")   update.closedAt   = new Date();

  const ticket = await SupportTicket.findByIdAndUpdate(ticketId, { $set: update }, { new: true })
    .populate("userId", "name email role")
    .populate("assignedTo", "name email")
    .lean();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  return NextResponse.json({ ticket });
});
