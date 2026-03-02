"use client";

import { createContext, useContext } from "react";
import type { JobStatus } from "@/types";

export interface ThreadPreview {
  jobId: string;
  title: string;
  status: JobStatus;
  unreadCount: number;
  lastBody: string | null;
  lastSender: string | null;
  lastAt: string | null;
}

interface MessagesContextValue {
  threads: ThreadPreview[];
}

const MessagesContext = createContext<MessagesContextValue>({ threads: [] });

export function MessagesProvider({
  threads,
  children,
}: {
  threads: ThreadPreview[];
  children: React.ReactNode;
}) {
  return (
    <MessagesContext.Provider value={{ threads }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}

/** Returns the thread preview for the given jobId, or null. */
export function useThreadMeta(jobId: string) {
  const { threads } = useContext(MessagesContext);
  return threads.find((t) => t.jobId === jobId) ?? null;
}
