import { messageRepository, jobRepository, notificationRepository } from "@/repositories";
import { pushMessage } from "@/lib/events";
import { pushNotification } from "@/lib/events";
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
  /** Verify the user is a participant (client or assigned provider) in the job thread. */
  private async assertParticipant(
    threadId: string,
    user: TokenPayload
  ): Promise<{ clientId: string; providerId: string | null }> {
    const job = await jobRepository.findById(threadId);
    if (!job) throw new NotFoundError("Job");

    const j = job as unknown as IJob;
    const clientId = j.clientId.toString();
    const providerId = j.providerId?.toString() ?? null;

    if (user.userId !== clientId && user.userId !== providerId) {
      throw new ForbiddenError("You are not a participant in this conversation");
    }

    return { clientId, providerId };
  }

  async getThread(user: TokenPayload, threadId: string) {
    await this.assertParticipant(threadId, user);
    await messageRepository.markThreadRead(threadId, user.userId);
    return messageRepository.findThread(threadId);
  }

  async sendMessage(user: TokenPayload, input: SendMessageInput) {
    const { clientId, providerId } = await this.assertParticipant(
      input.threadId,
      user
    );

    if (!providerId) {
      throw new UnprocessableError(
        "A provider must be assigned before messaging"
      );
    }

    const receiverId =
      user.userId === clientId ? providerId : clientId;

    const message = await messageRepository.create({
      threadId: input.threadId,
      senderId: user.userId,
      receiverId,
      body: input.body.trim(),
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
