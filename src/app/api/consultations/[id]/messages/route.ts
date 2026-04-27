import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consultationRepository, messageRepository } from "@/repositories";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, ForbiddenError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { Types } from "mongoose";
import { maskContactInfo } from "@/lib/contactFilter";

const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const POST = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    requireCsrfToken(req, user);

    const rl = await checkRateLimit(`consultation-msg:${user.userId}`, { windowMs: 60_000, max: 30 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { id } = await params;
    assertObjectId(id, "consultationId");

    const body = await req.json();
    const parsed = SendMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    const consultation = await consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundError("Consultation not found");
    }

    if (
      consultation.initiatorId.toString() !== user.userId &&
      consultation.targetUserId.toString() !== user.userId
    ) {
      throw new ForbiddenError("You do not have access to this consultation");
    }

    if (consultation.status === "declined" || consultation.status === "expired") {
      throw new ValidationError(`Cannot message a ${consultation.status} consultation`);
    }

    const message = await messageRepository.create({
      threadId: consultation.conversationThreadId,
      senderId: new Types.ObjectId(user.userId),
      receiverId: new Types.ObjectId(
        consultation.initiatorId.toString() === user.userId
          ? consultation.targetUserId.toString()
          : consultation.initiatorId.toString()
      ),
      body: maskContactInfo(parsed.data.body),
      type: "text",
      createdAt: new Date(),
    });

    return NextResponse.json(message, { status: 201 });
  }
);
