import { NextRequest } from "next/server";
import { supportBus } from "@/lib/events";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/admin/support/stream — SSE stream for admin support inbox */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const encoder = new TextEncoder();
  const eventKey = "support:admin";

  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      enqueue({ type: "connected" });

      const onMessage = (payload: unknown) => enqueue(payload);
      supportBus.on(eventKey, onMessage);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      let cleaned = false;
      cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        supportBus.off(eventKey, onMessage);
        clearInterval(heartbeat);
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
});
