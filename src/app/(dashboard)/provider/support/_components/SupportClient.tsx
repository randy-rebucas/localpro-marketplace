"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Headphones, Ticket, MessageCircle } from "lucide-react";
import MyTickets from "@/components/shared/MyTickets";

const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => <div className="flex-1 animate-pulse bg-slate-100 rounded-xl" />,
});

export function SupportClient({ userId }: { userId: string }) {
  const [tab, setTab] = useState<"chat" | "tickets">("chat");

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "chat" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <MessageCircle className="h-4 w-4" /> Live Chat
        </button>
        <button
          onClick={() => setTab("tickets")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "tickets" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Ticket className="h-4 w-4" /> My Tickets
        </button>
      </div>

      {tab === "tickets" && <MyTickets />}

      {tab === "chat" && (
        <ChatWindow
          fetchUrl="/api/support"
          postUrl="/api/support"
          streamUrl="/api/support/stream"
          attachUrl="/api/support/attachment"
          currentUserId={userId}
          header={
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Headphones className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Support Team</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online · Mon–Sat, 8 am–6 pm
                </span>
              </div>
            </div>
          }
          emptyMessage="Send us a message and our support team will get back to you."
        />
      )}
    </div>
  );
}
