import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";

/** DELETE /api/providers/profile/service-areas/[id] — remove a service area */
export const DELETE = withHandler(
  async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    requireRole(user, "provider");

    const { id } = await context.params;

    await connectDB();
    const profile = await ProviderProfile.findOne({ userId: user.userId });
    if (!profile) throw new NotFoundError("Provider profile");

    const before = (profile.serviceAreas ?? []).length;
    profile.serviceAreas = (profile.serviceAreas ?? []).filter(
      (a) => String((a as unknown as { _id: unknown })._id) !== id
    ) as never;

    if (profile.serviceAreas.length === before) {
      throw new NotFoundError("Service area");
    }

    await profile.save();
    return NextResponse.json(profile.serviceAreas);
  }
);
