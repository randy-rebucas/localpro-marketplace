"use client";

import ChatWindow from "@/components/chat/ChatWindow";
import { useAuthStore } from "@/stores/authStore";
import { Headphones } from "lucide-react";

export default function ProviderSupportPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ChatWindow
        fetchUrl="/api/support"
        postUrl="/api/support"
        streamUrl="/api/support/stream"
        currentUserId={String(user._id)}
        header={
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Support Team</p>
              <p className="text-xs text-slate-500">We typically respond within a few hours</p>
            </div>
          </div>
        }
        emptyMessage="Send us a message and our support team will get back to you."
      />
    </div>
  );
}
