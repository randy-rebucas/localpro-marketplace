import { NextRequest } from "next/server";
import { messageBus } from "@/lib/events";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { jobRepository } from "@/repositories";
import { ForbiddenError, NotFoundError, assertObjectId } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rateLimit";
import type { IJob } from "@/types";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`msg-stream:${user.userId}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok) return new Response("Too many requests", { status: 429 });

  const { threadId } = await params;
  assertObjectId(threadId, "threadId");

  // Verify participant before opening the stream
  const job = await jobRepository.findById(threadId);
  if (!job) throw new NotFoundError("Job");

  const j = job as unknown as IJob;
  const clientId = j.clientId.toString();
  const providerId = j.providerId?.toString() ?? null;
  if (user.userId !== clientId && user.userId !== providerId) {
    throw new ForbiddenError("You are not a participant in this conversation");
  }

  const encoder = new TextEncoder();
  const eventKey = `message:${threadId}`;
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup?.();
        }
      };

      enqueue({ type: "connected" });

      const onMessage = (payload: unknown) => enqueue(payload);
      messageBus.on(eventKey, onMessage);

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
        messageBus.off(eventKey, onMessage);
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
      "X-Accel-Buffering": "no",
    },
  });
});
