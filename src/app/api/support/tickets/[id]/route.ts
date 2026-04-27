import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";

const AdminPatchSchema = z.object({
  status:     z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority:   z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedTo: z.string().regex(/^[a-f\d]{24}$/i, "Invalid assignedTo ID").optional(),
});

const UserPatchSchema = z.object({
  csatScore: z.number().int().min(1).max(5).optional(),
});

/**
 * GET /api/support/tickets/[id]  — fetch a single ticket (owner or admin)
 * PATCH /api/support/tickets/[id] — user submits CSAT; admin updates any field
 */

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`support:tickets:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  await connectDB();
  const { id } = await params;

  const ticket = await SupportTicket.findById(id)
    .populate("userId", "name email role")
    .populate("assignedTo", "name email")
    .lean();

  if (!ticket) throw new NotFoundError("Ticket");

  const isOwner = ticket.userId &&
    typeof ticket.userId === "object" &&
    "_id" in ticket.userId &&
    String((ticket.userId as { _id: unknown })._id) === user.userId;

  const isAdmin = user.role === "admin" || user.role === "staff";

  if (!isOwner && !isAdmin) throw new ForbiddenError();

  return NextResponse.json({ ticket });
});

export const PATCH = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
  const rl2 = await checkRateLimit(`support:tickets:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl2.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  await connectDB();
  const { id } = await params;

  const ticket = await SupportTicket.findById(id);
  if (!ticket) throw new NotFoundError("Ticket");

  const isOwner = String(ticket.userId) === user.userId;
  const isAdmin = user.role === "admin" || user.role === "staff";

  if (!isOwner && !isAdmin) throw new ForbiddenError();

  const rawBody = await req.json().catch(() => ({}));

  if (isAdmin) {
    const parsed = AdminPatchSchema.safeParse(rawBody);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
    const { status, priority, assignedTo } = parsed.data;
    if (status)     ticket.status     = status;
    if (priority)   ticket.priority   = priority;
    if (assignedTo) ticket.assignedTo = new mongoose.Types.ObjectId(assignedTo) as unknown as typeof ticket.assignedTo;
    if (status === "resolved") ticket.resolvedAt = new Date();
    if (status === "closed")   ticket.closedAt   = new Date();
  }

  // CSAT: only owner, only when resolved/closed
  if (isOwner) {
    const parsed = UserPatchSchema.safeParse(rawBody);
    if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
    if (parsed.data.csatScore !== undefined) {
      if (!["resolved", "closed"].includes(ticket.status)) {
        return NextResponse.json({ error: "CSAT only allowed on resolved or closed tickets" }, { status: 400 });
      }
      ticket.csatScore = parsed.data.csatScore;
    }
  }

  await ticket.save();

  return NextResponse.json({ ticket });
});
