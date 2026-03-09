import { v2 as cloudinary } from "cloudinary";
import type { UploadFolder } from "@/types";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a file (Buffer or base64 data-URL string) to Cloudinary.
 * Returns the secure URL and public_id.
 */
export async function uploadToCloudinary(
  source: Buffer | string,
  folder: UploadFolder,
  options: {
    publicId?: string;
    overwrite?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    resourceType?: "image" | "raw" | "auto";
  } = {}
): Promise<{ url: string; publicId: string }> {
  const { publicId, overwrite = false, maxWidth = 1600, maxHeight = 1600, resourceType = "image" } = options;

  // If Buffer, wrap as a base64 data-URI (cloudinary accepts both)
  let uploadSource: string;
  if (source instanceof Buffer) {
    const mimeType = resourceType === "raw" ? "application/pdf" : "image/jpeg";
    uploadSource = `data:${mimeType};base64,${source.toString("base64")}`;
  } else {
    uploadSource = source as string;
  }

  const transformations = resourceType === "image"
    ? [{ width: maxWidth, height: maxHeight, crop: "limit" as const, quality: "auto:good", fetch_format: "auto" }]
    : [];

  const result = await cloudinary.uploader.upload(uploadSource, {
    folder,
    public_id: publicId,
    overwrite,
    ...(transformations.length ? { transformation: transformations } : {}),
    resource_type: resourceType,
  });

  return { url: result.secure_url, publicId: result.public_id };
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * Silently succeeds if the asset doesn't exist.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // non-fatal — log in production if needed
  }
}

export { cloudinary };
