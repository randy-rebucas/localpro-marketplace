/**
 * Status update store — receives silent real-time entity updates from the SSE
 * notification stream and exposes them for RealtimeRefresher islands to consume.
 *
 * Usage (in a client island):
 *   const lastUpdate = useStatusStore((s) => s.lastUpdate);
 */
import { create } from "zustand";
import type { StatusUpdatePayload } from "@/lib/events";

export type StatusEvent = StatusUpdatePayload & { timestamp: number };

interface StatusState {
  lastUpdate: StatusEvent | null;
  dispatch: (event: StatusUpdatePayload) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  lastUpdate: null,
  dispatch: (event) => set({ lastUpdate: { ...event, timestamp: Date.now() } }),
}));
