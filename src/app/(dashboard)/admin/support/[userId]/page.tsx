"use client";

import { use, useCallback } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { ChevronLeft, User } from "lucide-react";
import { useEffect, useState } from "react";

interface SupportUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ThreadResponse {
  user: SupportUser;
  messages: unknown[];
}

interface SSEAdminPayload {
  userId?: string;
  message?: Record<string, unknown>;
}

export default function AdminSupportThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const admin = useAuthStore((s) => s.user);
  const [targetUser, setTargetUser] = useState<SupportUser | null>(null);

  useEffect(() => {
    fetch(`/api/admin/support/${userId}`)
      .then((r) => r.json())
      .then((data: ThreadResponse) => setTargetUser(data.user))
      .catch(() => {});
  }, [userId]);

  // Extract messages array from { user, messages } response
  const transformResponse = useCallback(
    (data: unknown) => ((data as ThreadResponse).messages ?? []) as never[],
    []
  );

  // Admin SSE pushes { userId, message } — filter to only this user's thread
  const streamTransform = useCallback(
    (data: unknown) => {
      const d = data as SSEAdminPayload;
      if (d.userId === userId && d.message?._id) {
        return d.message as never;
      }
      return null;
    },
    [userId]
  );

  if (!admin) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <ChatWindow
        fetchUrl={`/api/admin/support/${userId}`}
        postUrl={`/api/admin/support/${userId}`}
        streamUrl="/api/admin/support/stream"
        currentUserId={String(admin._id)}
        transformResponse={transformResponse}
        streamTransform={streamTransform}
        header={
          <div className="flex items-center gap-3">
            <Link href="/admin/support" className="text-slate-500 hover:text-slate-800 transition-colors mr-1">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {targetUser?.name ?? "Loading…"}
              </p>
              {targetUser && (
                <p className="text-xs text-slate-500">{targetUser.email} · {targetUser.role}</p>
              )}
            </div>
          </div>
        }
        emptyMessage="No messages yet in this support thread."
      />
    </div>
  );
}
