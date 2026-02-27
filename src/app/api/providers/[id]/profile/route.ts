import { NextRequest, NextResponse } from "next/server";
import { providerProfileService } from "@/services";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireUser();
  const { id } = await params;
  const profile = await providerProfileService.getProfile(id);
  return NextResponse.json(profile);
});
