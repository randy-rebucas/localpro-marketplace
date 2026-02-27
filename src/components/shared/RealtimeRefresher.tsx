"use client";

/**
 * Zero-render client island that calls router.refresh() whenever the SSE
 * notification stream delivers a status-update for the watched entity.
 *
 * Usage (inside a server component):
 *   <RealtimeRefresher entity="job" id={jobId} />   ← refresh on one specific job
 *   <RealtimeRefresher entity="job" />               ← refresh on any job update
 *   <RealtimeRefresher entity="dispute" />            ← refresh on any dispute update
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStatusStore } from "@/stores/statusStore";

interface Props {
  entity: string;
  id?: string;
}

export default function RealtimeRefresher({ entity, id }: Props) {
  const router = useRouter();
  const lastUpdate = useStatusStore((s) => s.lastUpdate);
  const lastTimestamp = useRef<number | null>(null);

  useEffect(() => {
    if (!lastUpdate) return;
    // Skip duplicates (Zustand may replay on subscribe)
    if (lastUpdate.timestamp === lastTimestamp.current) return;
    lastTimestamp.current = lastUpdate.timestamp;

    const entityMatch = lastUpdate.entity === entity;
    const idMatch = !id || lastUpdate.id === id;

    if (entityMatch && idMatch) {
      router.refresh();
    }
  }, [lastUpdate, entity, id, router]);

  return null;
}
