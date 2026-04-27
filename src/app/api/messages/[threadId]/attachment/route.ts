import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, UnprocessableError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { cloudinary } from "@/lib/cloudinary";
import { jobRepository, messageRepository } from "@/repositories";
import type { IJob } from "@/types";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

/**
 * POST /api/messages/[threadId]/attachment
 * Accepts multipart/form-data with a single "file" field.
 * Uploads to Cloudinary and creates a message with type="file".
 */
export const POST = withHandler(
  async (req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) => {
    const user = await requireUser();
    requireCsrfToken(req, user);

    const rl = await checkRateLimit(`msg-attachment:${user.userId}`, { windowMs: 60_000, max: 10 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const { threadId } = await params;
    assertObjectId(threadId, "threadId");

    // Verify participant
    const job = await jobRepository.findById(threadId);
    if (!job) throw new UnprocessableError("Job not found");
    const j = job as unknown as IJob;
    const clientId = j.clientId.toString();
    const providerId = j.providerId?.toString() ?? null;
    if (user.userId !== clientId && user.userId !== providerId) {
      throw new ForbiddenError("You are not a participant in this conversation");
    }
    if (!providerId) {
      throw new UnprocessableError("A provider must be assigned before messaging");
    }

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new UnprocessableError("No file provided");

    if (file.size > MAX_SIZE_BYTES) throw new UnprocessableError("File too large (max 10 MB)");
    if (!ALLOWED_MIME.includes(file.type)) throw new UnprocessableError("File type not allowed");

    // Upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const isImage = file.type.startsWith("image/");
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "chat_attachments",
      resource_type: isImage ? "image" : "raw",
    });

    const receiverId = user.userId === clientId ? providerId : clientId;

    const message = await messageRepository.create({
      threadId,
      senderId: user.userId,
      receiverId,
      body: file.name,
      type: "file",
      fileUrl: result.secure_url,
      fileName: file.name,
      fileMime: file.type,
      fileSize: file.size,
    } as never);

    // Return populated message via repository
    const populated = await messageRepository.findByIdPopulated(
      (message as unknown as { _id: { toString(): string } })._id.toString()
    );
    return NextResponse.json(populated ?? message, { status: 201 });
  }
);
