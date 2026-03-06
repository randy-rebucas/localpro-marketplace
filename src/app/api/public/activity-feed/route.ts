/**
 * GET /api/public/activity-feed
 *
 * Fully public, no auth required.
 * Returns up to 10 recent job activity events for the live board feed.
 *
 * Each item:  { id, icon, message }
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";

export const dynamic = "force-dynamic";

// Map category keywords → emoji
const CATEGORY_ICONS: Record<string, string> = {
  plumbing:     "🔧",
  cleaning:     "🧹",
  electrical:   "⚡",
  appliance:    "🛠",
  carpentry:    "🪚",
  painting:     "🎨",
  landscaping:  "🌿",
  moving:       "📦",
  aircon:       "❄️",
  roofing:      "🏠",
  pest:         "🐜",
  security:     "🔒",
  delivery:     "🚚",
  photography:  "📷",
  tutoring:     "📚",
  cooking:      "🍳",
  massage:      "💆",
  welding:      "🔥",
  default:      "🔔",
};

const STATUS_LABELS: Record<string, string> = {
  open:          "posted",
  assigned:      "accepted",
  in_progress:   "started",
  completed:     "completed",
};

function iconForCategory(category: string): string {
  const lower = (category ?? "").toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return emoji;
  }
  return CATEGORY_ICONS.default;
}

export async function GET() {
  try {
    await connectDB();

    // Pull the 10 most recently updated jobs with notable statuses
    const jobs = await Job.find({
      status: { $in: ["open", "assigned", "in_progress", "completed"] },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("_id title category location status updatedAt")
      .lean();

    const items = jobs.map((job) => {
      const label = STATUS_LABELS[job.status as string] ?? job.status;
      const icon  = iconForCategory(job.category as string);
      const cat   = (job.category as string) ?? "Service";
      const loc   = (job.location as string) ?? "Philippines";

      return {
        id:      job._id?.toString() ?? String(Math.random()),
        icon,
        message: `${cat} job ${label} – ${loc}`,
      };
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("[/api/public/activity-feed]", err);
    return NextResponse.json([], { status: 200 }); // fail silently on the board
  }
}
