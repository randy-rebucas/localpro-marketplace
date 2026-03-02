import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { announcementRepository } from "@/repositories/announcement.repository";

/** GET /api/announcements — active announcements for the current user's role */
export const GET = withHandler(async () => {
  const user = await requireUser();
  const docs = await announcementRepository.findActiveForRole(user.role);

  const results = docs.map((a) => ({
    _id:         String(a._id),
    title:       a.title,
    message:     a.message,
    type:        a.type,
    targetRoles: a.targetRoles,
    createdAt:   a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  }));

  return NextResponse.json({ announcements: results });
});
