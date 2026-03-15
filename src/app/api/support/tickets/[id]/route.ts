import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCapability } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

/**
 * GET /api/support/tickets/[id]  — fetch a single ticket (owner or admin)
 * PATCH /api/support/tickets/[id] — user submits CSAT; admin updates any field
 */

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await requireUser();
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
  await connectDB();
  const { id } = await params;

  const ticket = await SupportTicket.findById(id);
  if (!ticket) throw new NotFoundError("Ticket");

  const isOwner = String(ticket.userId) === user.userId;
  const isAdmin = user.role === "admin" || user.role === "staff";

  if (!isOwner && !isAdmin) throw new ForbiddenError();

  const body = await req.json();

  if (isAdmin) {
    if (body.status)     ticket.status     = body.status;
    if (body.priority)   ticket.priority   = body.priority;
    if (body.assignedTo) ticket.assignedTo = body.assignedTo;
    if (body.status === "resolved") ticket.resolvedAt = new Date();
    if (body.status === "closed")   ticket.closedAt   = new Date();
  }

  // CSAT: only owner, only when resolved/closed
  if (isOwner && body.csatScore !== undefined) {
    if (!["resolved", "closed"].includes(ticket.status)) {
      return NextResponse.json({ error: "CSAT only allowed on resolved or closed tickets" }, { status: 400 });
    }
    const score = parseInt(body.csatScore, 10);
    if (score >= 1 && score <= 5) ticket.csatScore = score;
  }

  await ticket.save();

  return NextResponse.json({ ticket });
});
