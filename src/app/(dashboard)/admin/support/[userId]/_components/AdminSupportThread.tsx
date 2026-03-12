"use client";

import { useCallback } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
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

interface Props {
  userId: string;
  adminId: string;
  targetUser: SupportUser | null;
}

export default function AdminSupportThread({ userId, adminId, targetUser }: Props) {
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatWindow
        fetchUrl={`/api/admin/support/${userId}`}
        postUrl={`/api/admin/support/${userId}`}
        streamUrl="/api/admin/support/stream"
        attachUrl={`/api/admin/support/${userId}/attachment`}
        currentUserId={adminId}
        transformResponse={transformResponse}
        streamTransform={streamTransform}
        header={
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {targetUser?.name ?? "User"}
              </p>
              {targetUser && (
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
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
