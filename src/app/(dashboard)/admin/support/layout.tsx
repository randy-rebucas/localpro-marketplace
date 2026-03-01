import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supportService } from "@/services/support.service";
import AdminSupportShell from "./AdminSupportShell";
import type { SupportThread } from "./AdminSupportShell";

export default async function AdminSupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  const raw = await supportService.listThreads();

  const threads: SupportThread[] = raw.map((t) => {
    const lm = t.lastMessage as Record<string, unknown> | null;
    return {
      threadId: t.threadId,
      userId: t.userId,
      lastMessage: lm
        ? {
            body: typeof lm.body === "string" ? lm.body : null,
            createdAt: lm.createdAt ? String(lm.createdAt) : null,
            senderId: null, // not populated in aggregate — name resolution happens in shell via userId
          }
        : null,
      unreadForAdmin: t.unreadForAdmin,
      user: t.user
        ? {
            _id: t.user._id.toString(),
            name: t.user.name,
            email: t.user.email,
            role: t.user.role,
          }
        : null,
    };
  });

  return <AdminSupportShell threads={threads}>{children}</AdminSupportShell>;
}
