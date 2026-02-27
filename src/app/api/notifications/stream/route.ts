import { NextRequest } from "next/server";
import { notificationBus } from "@/lib/events";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const encoder = new TextEncoder();
  const eventKey = `notification:${user.userId}`;

  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // controller already closed
        }
      };

      // Initial connection confirmation
      enqueue({ type: "connected", userId: user.userId });

      const onNotification = (payload: unknown) => enqueue(payload);
      notificationBus.on(eventKey, onNotification);

      // Keepalive comment every 25s (prevents proxy timeouts)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      // Guard against double-invocation from cancel() + abort signal
      let cleaned = false;
      cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        notificationBus.off(eventKey, onNotification);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  // Handle client disconnect
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
