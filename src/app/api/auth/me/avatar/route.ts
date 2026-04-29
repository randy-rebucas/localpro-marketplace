import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireCsrfToken } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { userRepository } from "@/repositories";
import { checkRateLimit } from "@/lib/rateLimit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function verifyMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mimeType === "image/webp") {
    return (
      buf.slice(0, 4).toString("ascii") === "RIFF" &&
      buf.slice(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

/**
 * POST /api/auth/me/avatar
 *
 * Single-request avatar upload. Accepts multipart/form-data with a `file` field.
 * Uploads the image to Cloudinary (avatars folder), saves the URL on the user
 * record, and returns the updated avatar URL.
 *
 * Replaces the two-step flow (POST /api/upload → PUT /api/auth/me).
 * Useful for mobile apps where a single round-trip is preferable.
 *
 * Constraints:
 *   - JPEG, PNG, WEBP only (no PDFs)
 *   - Max 8 MB
 *   - Magic-byte verification to prevent MIME spoofing
 *   - Old avatar is deleted from Cloudinary after successful upload
 */
export const POST = withHandler(async (req: NextRequest) => {
  const tokenUser = await requireUser();
  requireCsrfToken(req, tokenUser);
  const rl = await checkRateLimit(`auth:avatar:${tokenUser.userId}`, { windowMs: 60 * 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) throw new ValidationError("No file provided");
  if (!ALLOWED_TYPES.includes(file.type))
    throw new ValidationError("Only JPEG, PNG, and WEBP images are allowed");

  // Extension check — gracefully handle files with no extension (e.g. iOS camera)
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (ext && !ALLOWED_EXTENSIONS.includes(ext))
    throw new ValidationError("File extension not allowed");

  if (file.size > MAX_BYTES)
    throw new ValidationError("Image must be under 8 MB");

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!verifyMagicBytes(buffer, file.type))
    throw new ValidationError("File content does not match its declared type");

  const user = await userRepository.getDocById(tokenUser.userId);
  if (!user) throw new NotFoundError("User");

  // Capture old publicId before upload so we can delete it after success
  const oldAvatarUrl: string | null = (user as unknown as { avatar?: string | null }).avatar ?? null;
  const oldPublicId = oldAvatarUrl
    ? oldAvatarUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)?.[1] ?? null
    : null;

  // Upload new avatar (Cloudinary auto-optimises: max 800×800, quality:auto)
  const { url } = await uploadToCloudinary(buffer, "avatars", {
    maxWidth: 800,
    maxHeight: 800,
  });

  // Persist URL to user record
  (user as unknown as { avatar: string }).avatar = url;
  await (user as unknown as { save(): Promise<void> }).save();

  // Delete old avatar from Cloudinary (non-fatal — don't block response)
  if (oldPublicId) {
    deleteFromCloudinary(oldPublicId).catch(() => {
      // silently ignore — stale asset cleanup is best-effort
    });
  }

  return NextResponse.json({ avatar: url });
});
