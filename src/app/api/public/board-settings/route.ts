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

import { settingsBus } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send an initial heartbeat so the browser knows the connection is live
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Keep-alive ping every 20 s to prevent proxy / browser timeouts
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20_000);

      // Listen for settings changes pushed by the admin PATCH route
      function onSettingsChanged() {
        try {
          controller.enqueue(encoder.encode("event: settings_changed\ndata: {}\n\n"));
        } catch {
          // Client already disconnected — ignore
        }
      }

      settingsBus.on("settings:changed", onSettingsChanged);

      // Clean up when the client disconnects
      return () => {
        clearInterval(heartbeat);
        settingsBus.off("settings:changed", onSettingsChanged);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
