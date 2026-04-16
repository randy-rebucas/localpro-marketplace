/**
 * Cascade soft-delete service.
 *
 * When a user account is soft-deleted the downstream records that depend on
 * that user need to be cleaned up so the platform stays consistent.
 *
 * Financial records (payments, transactions, ledger entries) are intentionally
 * preserved for regulatory / audit purposes.
 */

import {
  userRepository,
  jobRepository,
  quoteRepository,
  providerProfileRepository,
  businessOrganizationRepository,
  activityRepository,
} from "@/repositories";
import { Types } from "mongoose";

export interface CascadeResult {
  affected: Record<string, number>;
}

export class CascadeService {
  /**
   * Soft-delete a user and cascade side-effects to related collections.
   *
   * 1. Mark User as isDeleted + isSuspended.
   * 2. Cancel all open/assigned jobs where the user is the client.
   * 3. Reject all pending quotes submitted by this user (as provider).
   * 4. Set provider profile availabilityStatus to "unavailable".
   * 5. Suspend any business organizations owned by this user.
   * 6. Log the cascade action to the ActivityLog.
   *
   * Does NOT touch financial records (payments, transactions, ledger entries).
   */
  async cascadeSoftDelete(userId: string): Promise<CascadeResult> {
    const affected: Record<string, number> = {};
    const userObjId = new Types.ObjectId(userId);

    // 1. Soft-delete the user
    const userUpdate = await userRepository.updateMany(
      { _id: userObjId },
      { $set: { isDeleted: true, deletedAt: new Date(), isSuspended: true } }
    );
    affected.users = userUpdate.modifiedCount ?? 0;

    // 2. Cancel all open/assigned jobs where this user is the client
    const jobCancelResult = await jobRepository.updateMany(
      {
        clientId: userObjId,
        status: { $in: ["open", "assigned"] },
      },
      { $set: { status: "cancelled" } }
    );
    affected.jobsCancelled = jobCancelResult.modifiedCount ?? 0;

    // 3. Reject all pending quotes submitted by this user (as provider)
    const quoteRejectResult = await quoteRepository.updateMany(
      {
        providerId: userObjId,
        status: "pending",
      },
      { $set: { status: "rejected" } }
    );
    affected.quotesRejected = quoteRejectResult.modifiedCount ?? 0;

    // 4. Mark provider profile as unavailable (if one exists)
    const profileUpdate = await providerProfileRepository.updateMany(
      { userId: userObjId },
      { $set: { availabilityStatus: "unavailable" } }
    );
    affected.profilesUpdated = profileUpdate.modifiedCount ?? 0;

    // 5. Suspend any business organization owned by this user
    const orgUpdate = await businessOrganizationRepository.updateMany(
      { ownerId: userObjId },
      { $set: { planStatus: "cancelled" } }
    );
    affected.businessOrgsUpdated = orgUpdate.modifiedCount ?? 0;

    // 6. Log the cascade action
    try {
      await activityRepository.log({
        userId,
        eventType: "job_cancelled",
        metadata: {
          action: "cascade_soft_delete",
          affected,
        },
      });
    } catch {
      // Activity logging failure should not break the cascade
    }

    return { affected };
  }
}

export const cascadeService = new CascadeService();
