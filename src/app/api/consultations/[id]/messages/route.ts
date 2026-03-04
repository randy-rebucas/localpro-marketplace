import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consultationRepository, messageRepository } from "@/repositories";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { Types } from "mongoose";
import { maskContactInfo } from "@/lib/contactFilter";

const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const POST = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;

    const body = await req.json();
    const parsed = SendMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    // Get consultation
    const consultation = await consultationRepository.findById(id);
    if (!consultation) {
      throw new NotFoundError("Consultation not found");
    }

    // Authorization: Only participants can message
    if (
      consultation.initiatorId.toString() !== user.userId &&
      consultation.targetUserId.toString() !== user.userId
    ) {
      throw new ForbiddenError(
        "You do not have access to this consultation"
      );
    }

    // Status check: Cannot message declined/expired consultations
    if (consultation.status === "declined" || consultation.status === "expired") {
      throw new ValidationError(
        `Cannot message a ${consultation.status} consultation`
      );
    }

    // Create message
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
