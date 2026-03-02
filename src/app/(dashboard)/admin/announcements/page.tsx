import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { announcementRepository } from "@/repositories/announcement.repository";
import AnnouncementsClient from "./AnnouncementsClient";
import PageGuide from "@/components/shared/PageGuide";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

  const docs = await announcementRepository.findAll();
  const announcements = JSON.parse(JSON.stringify(docs));

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="admin-announcements"
        title="How Announcements work"
        steps={[
          { icon: "📢", title: "Create announcements", description: "Write a title and message, then choose who sees it: all users, clients, providers, or admin/staff only." },
          { icon: "🎨", title: "Choose a type", description: "Info (blue), Warning (amber), Success (green), or Danger (red) — sets the banner colour shown to users." },
          { icon: "⏰", title: "Optional expiry", description: "Set an expiry date and the banner disappears automatically. Leave blank to keep it active until you deactivate it." },
          { icon: "✅", title: "Activate / deactivate", description: "Toggle any announcement on or off without deleting it. Users dismiss banners per-device." },
        ]}
      />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Broadcast messages displayed as banners across user dashboards
        </p>
      </div>
      <AnnouncementsClient initialAnnouncements={announcements} />
    </div>
  );
}
