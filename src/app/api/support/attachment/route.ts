import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { UnprocessableError } from "@/lib/errors";
import { cloudinary } from "@/lib/cloudinary";
import { messageRepository, userRepository } from "@/repositories";
import { pushSupportToAdmin, pushSupportToUser } from "@/lib/events";
import { checkRateLimit } from "@/lib/rateLimit";
import Message from "@/models/Message";
import { businessService } from "@/services/business.service";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;

type AllowedMime = typeof ALLOWED_MIME[number];

function verifyMagicBytes(buf: Buffer, mime: AllowedMime): boolean {
  switch (mime) {
    case "image/jpeg":  return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "image/png":   return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    case "image/webp":  return buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP";
    case "image/gif":   return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
    case "application/pdf": return buf.slice(0, 4).toString("ascii") === "%PDF";
    // Office/text formats: no universal magic bytes; accept on MIME alone
    default: return true;
  }
}

/**
 * POST /api/support/attachment
 * Accepts multipart/form-data with a single "file" field.
 * Uploads to Cloudinary and creates a support message with type="file".
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`support-attach:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Enforce Priority Support plan gate for business clients
  await businessService.checkPrioritySupportAccess(user.userId);

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SIZE_BYTES + 4096) throw new UnprocessableError("File too large (max 10 MB)");

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) throw new UnprocessableError("No file provided");
  if (file.size > MAX_SIZE_BYTES) throw new UnprocessableError("File too large (max 10 MB)");
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) throw new UnprocessableError("File type not allowed");

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!verifyMagicBytes(buffer, file.type as AllowedMime)) {
    throw new UnprocessableError("File content does not match its declared type");
  }

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
