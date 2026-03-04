import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { UnprocessableError } from "@/lib/errors";
import { cloudinary } from "@/lib/cloudinary";
import { messageRepository, userRepository } from "@/repositories";
import { pushSupportToAdmin, pushSupportToUser } from "@/lib/events";
import Message from "@/models/Message";

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
 * POST /api/support/attachment
 * Accepts multipart/form-data with a single "file" field.
 * Uploads to Cloudinary and creates a support message with type="file".
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) throw new UnprocessableError("No file provided");
  if (file.size > MAX_SIZE_BYTES) throw new UnprocessableError("File too large (max 10 MB)");
  if (!ALLOWED_MIME.includes(file.type)) throw new UnprocessableError("File type not allowed");

  const buffer = Buffer.from(await file.arrayBuffer());
  const isImage = file.type.startsWith("image/");
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "support_attachments",
    resource_type: isImage ? "image" : "raw",
  });

  const admin = await userRepository.findAdmin();
  const receiverId = admin ? admin._id.toString() : user.userId;

  const message = await messageRepository.create({
    threadId: `support:${user.userId}`,
    senderId: user.userId,
    receiverId,
    body: file.name,
    type: "file",
    fileUrl: result.secure_url,
    fileName: file.name,
    fileMime: file.type,
    fileSize: file.size,
  } as never);

  const populated = await Message.findById(message._id)
    .populate("senderId", "name role")
    .populate("receiverId", "name role")
    .lean();

  const payload = { ...(populated ?? message), __support: true };
  pushSupportToUser(user.userId, payload);
  pushSupportToAdmin({ userId: user.userId, message: payload });

  return NextResponse.json(populated ?? message, { status: 201 });
});
