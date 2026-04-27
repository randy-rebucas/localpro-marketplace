import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { announcementRepository } from "@/repositories/announcement.repository";
import AnnouncementsClient from "./AnnouncementsClient";
import TourGuide from "@/components/shared/TourGuide";
import { Megaphone } from "lucide-react";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  const docs = await announcementRepository.findAll();
  const announcements = JSON.parse(JSON.stringify(docs));

  return (
    <div className="space-y-5">
      <TourGuide
        pageKey="admin-announcements"
        title="How Announcements work"
        steps={[
          { icon: "📢", title: "Create announcements", description: "Write a title and message, then choose who sees it: all users, clients, providers, or admin/staff only." },
          { icon: "🎨", title: "Choose a type", description: "Info (blue), Warning (amber), Success (green), or Danger (red) — sets the banner colour shown to users." },
          { icon: "⏰", title: "Optional expiry", description: "Set an expiry date and the banner disappears automatically. Leave blank to keep it active until you deactivate it." },
          { icon: "✅", title: "Activate / deactivate", description: "Toggle any announcement on or off without deleting it. Users dismiss banners per-device." },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-4 shadow-sm">
        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <Megaphone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Announcements</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Broadcast messages displayed as banners across user dashboards</p>
        </div>
      </div>

      <AnnouncementsClient initialAnnouncements={announcements} />
    </div>
  );
}
