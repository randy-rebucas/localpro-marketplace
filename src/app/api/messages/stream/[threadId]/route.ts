import { NextRequest } from "next/server";
import { messageBus } from "@/lib/events";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { jobRepository } from "@/repositories";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { IJob } from "@/types";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) => {
  const user = await requireUser();
  const { threadId } = await params;

  // Verify participant
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
        } catch {}
      };

      enqueue({ type: "connected", threadId });

      const onMessage = (payload: unknown) => enqueue(payload);
      messageBus.on(eventKey, onMessage);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      cleanup = () => {
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
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
