import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import ProviderProfile from "@/models/ProviderProfile";

/** DELETE /api/providers/profile/service-areas/[id] — remove a service area */
export const DELETE = withHandler(
  async (_req: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    requireRole(user, "provider");

    const { id } = await context.params;

    const rl = await checkRateLimit(`service-area-del:${user.userId}`, { windowMs: 60_000, max: 20 });
    if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

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
