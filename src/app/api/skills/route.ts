import { NextRequest, NextResponse } from "next/server";
import { skillRepository } from "@/repositories";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const GET = withHandler(async (req: NextRequest) => {
  const rl = await checkRateLimit(`skills:${clientIp(req)}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").slice(0, 100);
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit") ?? "10") || 10, 20));

  const skills = await skillRepository.search(q, limit);
  return NextResponse.json({ skills });
});
