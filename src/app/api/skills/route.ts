import { NextRequest, NextResponse } from "next/server";
import { skillRepository } from "@/repositories";
import { withHandler } from "@/lib/utils";

export const GET = withHandler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 20);

  const skills = await skillRepository.search(q, limit);
  return NextResponse.json({ skills });
});
