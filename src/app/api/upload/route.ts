import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { UploadFolder } from "@/types";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FOLDERS: UploadFolder[] = ["jobs/before", "jobs/after", "avatars", "kyc", "misc", "resumes"];

/**
 * L9: Verify the file's magic bytes against its declared MIME type.
 * This prevents an attacker from renaming an EXE or SVG to "photo.jpg"
 * and bypassing the MIME-type check above.
 */
function verifyMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mimeType === "image/webp") {
    return buf.slice(0, 4).toString("ascii") === "RIFF" &&
      buf.slice(8, 12).toString("ascii") === "WEBP";
  }
  if (mimeType === "application/pdf") {
    return buf.slice(0, 4).toString("ascii") === "%PDF";
  }
  return false;
}

export const POST = withHandler(async (req: NextRequest) => {
  await requireUser();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folderParam = (formData.get("folder") as string | null) ?? "misc";

  if (!file) throw new ValidationError("No file provided");
  if (!ALLOWED_TYPES.includes(file.type)) throw new ValidationError("Only JPEG, PNG, WEBP, and PDF files are allowed");
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) throw new ValidationError("File extension not allowed");
  if (file.size > MAX_BYTES) throw new ValidationError("File exceeds the 10 MB limit");
  if (!ALLOWED_FOLDERS.includes(folderParam as UploadFolder)) throw new ValidationError("Invalid upload folder");

  const buffer = Buffer.from(await file.arrayBuffer());

  // L9: Verify magic bytes to guard against MIME-type spoofing
  if (!verifyMagicBytes(buffer, file.type)) {
    throw new ValidationError("File content does not match its declared type");
  }

  const resourceType = file.type === "application/pdf" ? "raw" : "image";
  const { url, publicId } = await uploadToCloudinary(buffer, folderParam as UploadFolder, { resourceType });

  return NextResponse.json({ url, publicId }, { status: 201 });
});

