import { withHandler, apiResponse } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { UnprocessableError } from "@/lib/errors";

// Known magic bytes for allowed image formats
const IMAGE_MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif",  bytes: [0x47, 0x49, 0x46] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF header
];

function validateImageMagicBytes(buffer: Buffer): boolean {
  for (const sig of IMAGE_MAGIC_BYTES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    const match = sig.bytes.every((b, i) => buffer[offset + i] === b);
    if (match) return true;
  }
  return false;
}

/**
 * POST /api/admin/blogs/upload-image
 * 
 * Upload featured image for blog posts to Cloudinary
 * Requires: User authentication + manage_blogs capability
 */
export const POST = withHandler(async (req) => {
  const user = await requireUser();
  requireCapability(user, "manage_blogs");

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return apiResponse(
      { error: "No file provided" },
      400
    );
  }

  // Validate file
  if (!file.type.startsWith("image/")) {
    return apiResponse(
      { error: "File must be an image" },
      400
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return apiResponse(
      { error: "File must be less than 5MB" },
      400
    );
  }

  try {
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes — MIME type alone is spoofable
    if (!validateImageMagicBytes(buffer)) {
      throw new UnprocessableError("File content does not match a supported image format (JPEG, PNG, GIF, WebP)");
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, "blogs", {
      resourceType: "image",
      maxWidth: 1200,
      maxHeight: 630,
    });

    return apiResponse({
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return apiResponse(
      { error: error instanceof Error ? error.message : "Upload failed" },
      500
    );
  }
});
