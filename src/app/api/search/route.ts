import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";
import User from "@/models/User";

export interface SearchResult {
  _id: string;
  label: string;
  sublabel?: string;
  type: "job" | "user" | "provider";
  href: string;
}

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  await connectDB();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const results: SearchResult[] = [];

  // ── Admin / Staff ────────────────────────────────────────────────────────────
  if (user.role === "admin" || user.role === "staff") {
    const [jobs, users] = await Promise.all([
      Job.find({ $or: [{ title: regex }, { category: regex }, { location: regex }] })
        .limit(5)
        .select("_id title status category")
        .lean(),
      User.find({ $or: [{ name: regex }, { email: regex }] })
        .limit(5)
        .select("_id name email role")
        .lean(),
    ]);

    for (const j of jobs as { _id: object; title: string; status: string; category: string }[]) {
      results.push({
        _id: String(j._id),
        label: j.title,
        sublabel: `${j.category} · ${j.status.replace(/_/g, " ")}`,
        type: "job",
        href: `/admin/jobs/${String(j._id)}`,
      });
    }

    for (const u of users as { _id: object; name: string; email: string; role: string }[]) {
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
    const jobs = await Job.find({
      clientId: user.userId,
      $or: [{ title: regex }, { category: regex }],
    })
      .limit(5)
      .select("_id title status category")
      .lean();

    for (const j of jobs as { _id: object; title: string; status: string; category: string }[]) {
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
    const jobs = await Job.find({
      status: "open",
      $or: [{ title: regex }, { category: regex }, { location: regex }],
    })
      .limit(5)
      .select("_id title category location")
      .lean();

    for (const j of jobs as { _id: object; title: string; category: string; location: string }[]) {
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
