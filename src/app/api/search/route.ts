import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { jobRepository, userRepository } from "@/repositories";

export interface SearchResult {
  _id: string;
  label: string;
  sublabel?: string;
  type: "job" | "user" | "provider";
  href: string;
}

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`search:${user.userId}`, { windowMs: 60_000, max: 60 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const results: SearchResult[] = [];

  // ── Admin / Staff ────────────────────────────────────────────────────────────
  if (user.role === "admin" || user.role === "staff") {
    const [jobs, users] = await Promise.all([
      jobRepository.searchForAdmin(regex),
      userRepository.searchForAdmin(regex),
    ]);

    for (const j of jobs) {
      results.push({
        _id: String(j._id),
        label: j.title,
        sublabel: `${j.category} · ${j.status.replace(/_/g, " ")}`,
        type: "job",
        href: `/admin/jobs/${String(j._id)}`,
      });
    }

    for (const u of users) {
      results.push({
        _id: String(u._id),
        label: u.name,
        sublabel: `${u.email} · ${u.role}`,
        type: "user",
        href: `/admin/users`,
      });
    }

    return NextResponse.json({ results });
  }

  // ── Client ───────────────────────────────────────────────────────────────────
  if (user.role === "client") {
    const jobs = await jobRepository.searchForClient(user.userId, regex);

    for (const j of jobs) {
      results.push({
        _id: String(j._id),
        label: j.title,
        sublabel: `${j.category} · ${j.status.replace(/_/g, " ")}`,
        type: "job",
        href: `/client/jobs/${String(j._id)}`,
      });
    }

    return NextResponse.json({ results });
  }

  // ── Provider ─────────────────────────────────────────────────────────────────
  if (user.role === "provider") {
    const jobs = await jobRepository.searchForProvider(regex);

    for (const j of jobs) {
      results.push({
        _id: String(j._id),
        label: j.title,
        sublabel: `${j.category} · ${j.location}`,
        type: "job",
        href: `/provider/marketplace`,
      });
    }

    return NextResponse.json({ results });
  }

  return NextResponse.json({ results: [] });
});
