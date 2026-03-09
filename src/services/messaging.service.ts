import { messageRepository, jobRepository, notificationRepository } from "@/repositories";
import { pushMessage } from "@/lib/events";
import { pushNotification } from "@/lib/events";
import { maskContactInfo } from "@/lib/contactFilter";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableError,
} from "@/lib/errors";
import type { TokenPayload } from "@/lib/auth";
import type { IJob } from "@/types";

export interface SendMessageInput {
  threadId: string; // = jobId
  body: string;
}

export class MessagingService {
  /** Verify the user is a participant (client or assigned provider) in the job thread.
   * For open PESO/LGU jobs any provider may start an inquiry thread. */
  private async assertParticipant(
    threadId: string,
    user: TokenPayload
  ): Promise<{ clientId: string; providerId: string | null; isPesoJob: boolean }> {
    const job = await jobRepository.findById(threadId);
    if (!job) throw new NotFoundError("Job");

    const j = job as unknown as IJob;
    const clientId   = j.clientId.toString();
    const providerId = j.providerId?.toString() ?? null;
    const isPesoJob  = j.jobSource === "peso" || j.jobSource === "lgu";

    const isClient   = user.userId === clientId;
    const isAssigned = user.userId === providerId;
    // Any authenticated provider may open an inquiry on an open PESO/LGU job
    const isPesoInquiry = isPesoJob && j.status === "open" && user.role === "provider";

    if (!isClient && !isAssigned && !isPesoInquiry) {
      throw new ForbiddenError("You are not a participant in this conversation");
    }

    return { clientId, providerId, isPesoJob };
  }

  async getThread(user: TokenPayload, threadId: string) {
    await this.assertParticipant(threadId, user);
    await messageRepository.markThreadRead(threadId, user.userId);
    return messageRepository.findThread(threadId);
  }

  async sendMessage(user: TokenPayload, input: SendMessageInput) {
    const { clientId, providerId, isPesoJob } = await this.assertParticipant(
      input.threadId,
      user
    );

    // For regular jobs: provider must be assigned
    // For PESO/LGU jobs: provider can message the PESO officer (clientId) before being assigned
    if (!providerId && !isPesoJob) {
      throw new UnprocessableError(
        "A provider must be assigned before messaging"
      );
    }

    const receiverId =
      user.userId === clientId
        ? (providerId ?? user.userId) // fallback shouldn't happen
        : clientId;

    const message = await messageRepository.create({
      threadId:   input.threadId,
      senderId:   user.userId,
      receiverId,
      body:       maskContactInfo(input.body.trim()),
    });

    // Push to SSE stream
    pushMessage(input.threadId, message);

    // Create in-app notification for receiver
    const notification = await notificationRepository.create({
      userId: receiverId,
      type: "new_message",
      title: "New message",
      message: input.body.slice(0, 80) + (input.body.length > 80 ? "…" : ""),
      data: { messageThreadId: input.threadId },
    });
    pushNotification(receiverId, notification);

    return message;
  }
}

export const messagingService = new MessagingService();
