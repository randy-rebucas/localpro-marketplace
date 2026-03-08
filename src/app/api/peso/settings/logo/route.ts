import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { pesoService } from "@/services/peso.service";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { ValidationError } from "@/lib/errors";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export const POST = withHandler(async (req: Request) => {
  const user = await requireUser();
  requireRole(user, "peso");

  const formData = await req.formData();
  const file = formData.get("logo");

  if (!(file instanceof File)) throw new ValidationError("No image file provided");
  if (file.size > MAX_BYTES) throw new ValidationError("Logo must be 2 MB or smaller");
  if (!file.type.startsWith("image/")) throw new ValidationError("File must be an image");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await uploadToCloudinary(buffer, "peso/logos", {
    publicId: `peso-logo-${user.userId}`,
    overwrite: true,
    maxWidth: 400,
    maxHeight: 400,
  });

  const updated = await pesoService.updateOfficeLogo(user.userId, url);
  return NextResponse.json(updated);
});

export const DELETE = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "peso");

  const updated = await pesoService.updateOfficeLogo(user.userId, "");
  return NextResponse.json(updated);
});
