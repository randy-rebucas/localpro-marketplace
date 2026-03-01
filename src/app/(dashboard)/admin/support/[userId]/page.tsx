"use client";

import { use, useCallback, useEffect, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/stores/authStore";
import { User } from "lucide-react";

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

  const transformResponse = useCallback(
    (data: unknown) => ((data as ThreadResponse).messages ?? []) as never[],
    []
  );

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
    <div className="flex flex-col h-full overflow-hidden">
      <ChatWindow
        fetchUrl={`/api/admin/support/${userId}`}
        postUrl={`/api/admin/support/${userId}`}
        streamUrl="/api/admin/support/stream"
        currentUserId={String(admin._id)}
        transformResponse={transformResponse}
        streamTransform={streamTransform}
        header={
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {targetUser?.name ?? "Loading…"}
              </p>
              {targetUser && (
                <p className="text-xs text-slate-500 capitalize">
                  {targetUser.email} · {targetUser.role}
                </p>
              )}
            </div>
          </div>
        }
        emptyMessage="No messages yet in this support thread."
      />
    </div>
  );
}

