import { withHandler, apiResponse } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

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
