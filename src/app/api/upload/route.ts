import { NextRequest, NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { UploadFolder } from "@/types";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FOLDERS: UploadFolder[] = ["jobs/before", "jobs/after", "avatars", "kyc", "misc"];

export const POST = withHandler(async (req: NextRequest) => {
  await requireUser();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folderParam = (formData.get("folder") as string | null) ?? "misc";

  if (!file) throw new ValidationError("No file provided");
  if (!ALLOWED_TYPES.includes(file.type)) throw new ValidationError("Only JPEG, PNG, and WEBP images are allowed");
  if (file.size > MAX_BYTES) throw new ValidationError("File exceeds the 10 MB limit");
  if (!ALLOWED_FOLDERS.includes(folderParam as UploadFolder)) throw new ValidationError("Invalid upload folder");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url, publicId } = await uploadToCloudinary(buffer, folderParam as UploadFolder);

  return NextResponse.json({ url, publicId }, { status: 201 });
});

