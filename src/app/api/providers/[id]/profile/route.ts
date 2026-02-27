import { NextRequest, NextResponse } from "next/server";
import { providerProfileService } from "@/services";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const profile = await providerProfileService.getProfile(id);
  return NextResponse.json(profile);
});
