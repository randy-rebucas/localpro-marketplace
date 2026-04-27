import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import type { SupportTicketCategory, SupportTicketPriority } from "@/models/SupportTicket";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const optionalObjectId = z.string().regex(OBJECT_ID_RE, "Invalid ID format").optional();

const CreateTicketSchema = z.object({
  subject:          z.string().min(5).max(255),
  body:             z.string().min(10).max(5000),
  category:         z.enum(["billing", "account", "dispute", "technical", "kyc", "payout", "other"]),
  relatedDisputeId: optionalObjectId,
  relatedJobId:     optionalObjectId,
});

/**
 * GET /api/support/tickets
 * Returns all tickets for the authenticated user.
 *
 * POST /api/support/tickets
 * Creates a new support ticket.
 */

export const GET = withHandler(async (_req: NextRequest) => {
  const currentUser = await requireUser();
  await connectDB();

  const tickets = await SupportTicket.find({ userId: currentUser.userId })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ tickets });
});

export const POST = withHandler(async (req: NextRequest) => {
  const currentUser = await requireUser();

  const rl = await checkRateLimit(`support-ticket:${currentUser.userId}`, { windowMs: 3_600_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body   = await req.json().catch(() => ({}));
  const parsed = CreateTicketSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  await connectDB();

  // Determine priority based on category keywords
  let priority: SupportTicketPriority = "normal";
  if (parsed.data.category === "billing" || parsed.data.category === "payout") {
    priority = "high";
  } else if (parsed.data.category === "dispute") {
    priority = "urgent";
  }

  const ticket = await SupportTicket.create({
    userId:           currentUser.userId,
    subject:          parsed.data.subject,
    body:             parsed.data.body,
    category:         parsed.data.category as SupportTicketCategory,
    priority,
    relatedDisputeId: parsed.data.relatedDisputeId,
    relatedJobId:     parsed.data.relatedJobId,
  });

  return NextResponse.json({ ticket }, { status: 201 });
});
