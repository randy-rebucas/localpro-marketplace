/**
 * GET /api/public/board-settings
 *
 * Server-Sent Events stream — publicly accessible (no auth required).
 * Kept alive and emits a "settings:changed" event whenever an admin
 * saves app settings, prompting the board / kiosk to re-fetch board data.
 *
 * Event format:
 *   event: settings_changed\n
 *   data: {}\n\n
 */

import { NextRequest } from "next/server";
import { settingsBus } from "@/lib/events";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(`board-settings-sse:${clientIp(req)}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return new Response("Too many requests", { status: 429 });

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20_000);

      function onSettingsChanged() {
        try {
          controller.enqueue(encoder.encode("event: settings_changed\ndata: {}\n\n"));
        } catch {}
      }

      settingsBus.on("settings:changed", onSettingsChanged);

      let cleaned = false;
      cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        clearInterval(heartbeat);
        settingsBus.off("settings:changed", onSettingsChanged);
        try { controller.close(); } catch {}
      };
    },
    cancel() { cleanup?.(); },
  });

  req.signal.addEventListener("abort", () => cleanup?.());

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
