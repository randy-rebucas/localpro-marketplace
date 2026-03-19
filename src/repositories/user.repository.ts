import User from "@/models/User";
import type { UserDocument, PushSubscriptionRecord } from "@/models/User";
import { BaseRepository } from "./base.repository";

export type UserSortOption = "newest" | "oldest" | "name_asc" | "name_desc";

const USER_SORT_MAP: Record<UserSortOption, Record<string, 1 | -1>> = {
  newest:    { createdAt: -1 },
  oldest:    { createdAt:  1 },
  name_asc:  { name:       1 },
  name_desc: { name:      -1 },
};

export class UserRepository extends BaseRepository<UserDocument> {
  constructor() {
    super(User);
  }

  /** Returns a full Mongoose document with the password field for mutation workflows. */
  async getDocByIdWithPassword(userId: string): Promise<UserDocument | null> {
    await this.connect();
    return User.findById(userId).select("+password");
  }

  /** Includes password field for auth comparison. */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    await this.connect();
    return User.findOne({ email }).select("+password");
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    await this.connect();
    return User.findOne({ email }).lean() as unknown as UserDocument | null;
  }

  /**
   * Finds active client/provider users who registered before `registeredBefore`
   * and have at least one incomplete profile field (phone, avatar, or email verification).
   * Used by the profile-completion cron job.
   */
  async findIncompleteProfiles(registeredBefore: Date): Promise<UserDocument[]> {
    await this.connect();
    return User.find({
      role: { $in: ["client", "provider"] },
      isSuspended: false,
      createdAt: { $lt: registeredBefore },
      $or: [
        { phone: null },
        { phone: { $exists: false } },
        { avatar: null },
        { isVerified: false },
      ],
    })
      .select("-password")
      .lean() as unknown as UserDocument[];
  }

  /**
   * @deprecated Prefer findPaginated() for large result sets.
   * Kept for internal small-set lookups (e.g. fetching a handful of users by ID).
   * Capped at 100 rows as a safety measure.
   */
  async findAll(filter: Record<string, unknown> = {}): Promise<UserDocument[]> {
    await this.connect();
    return User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean() as unknown as UserDocument[];
  }

  async findPaginated(
    filter: Record<string, unknown> = {},
    page: number,
    limit: number,
    sort: UserSortOption = "newest"
  ): Promise<{ users: UserDocument[]; total: number }> {
    await this.connect();
    // Always exclude soft-deleted users from paginated admin listing
    const safeFilter = { isDeleted: { $ne: true }, ...filter };
    const [users, total] = await Promise.all([
      User.find(safeFilter)
        .select("-password")
        .sort(USER_SORT_MAP[sort])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean() as unknown as Promise<UserDocument[]>,
      User.countDocuments(safeFilter),
    ]);
    return { users, total };
  }

  /** Aggregate counts useful for admin dashboards/banners.
   * @param since  Optional date — when supplied, also returns `newUsersThisMonth`
   *               (count of users created on or after this date).
   */
  async getUserStats(since?: Date): Promise<{
    suspended: number;
    pendingProviders: number;
    pendingKyc: number;
    newUsersSince: number;
    totalUsers: number;
  }> {
    await this.connect();
    const base = { isDeleted: { $ne: true } };
    const [suspended, pendingProviders, pendingKyc, newUsersSince, totalUsers] = await Promise.all([
      User.countDocuments({ ...base, isSuspended: true }),
      User.countDocuments({ ...base, role: "provider", approvalStatus: "pending_approval" }),
      User.countDocuments({ ...base, kycStatus: "pending" }),
      since ? User.countDocuments({ ...base, createdAt: { $gte: since } }) : Promise.resolve(0),
      User.countDocuments(base),
    ]);
    return { suspended, pendingProviders, pendingKyc, newUsersSince, totalUsers };
  }

  async updateUser(
    id: string,
    updates: { isVerified?: boolean; isSuspended?: boolean; approvalStatus?: string }
  ): Promise<UserDocument | null> {
    return this.updateById(id, updates);
  }

  // ─── Email Verification ──────────────────────────────────────────────────

  async setVerificationToken(
    userId: string,
    token: string,
    expiry: Date
  ): Promise<void> {
    await this.connect();
    await User.findByIdAndUpdate(userId, {
      verificationToken: token,
      verificationTokenExpiry: expiry,
    });
  }

  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    await this.connect();
    return User.findOne({ verificationToken: token }).select(
      "+verificationToken +verificationTokenExpiry"
    );
  }

  async markVerified(userId: string): Promise<void> {
    await this.connect();
    await User.findByIdAndUpdate(userId, {
      isVerified: true,
      $unset: { verificationToken: 1, verificationTokenExpiry: 1 },
    });
  }

  // ─── Password Reset ──────────────────────────────────────────────────────

  async setResetPasswordToken(
    userId: string,
    token: string,
    expiry: Date
  ): Promise<void> {
    await this.connect();
    await User.findByIdAndUpdate(userId, {
      resetPasswordToken: token,
      resetPasswordTokenExpiry: expiry,
    });
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    await this.connect();
    return User.findOne({ resetPasswordToken: token }).select(
      "+resetPasswordToken +resetPasswordTokenExpiry"
    );
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.connect();
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      $unset: { resetPasswordToken: 1, resetPasswordTokenExpiry: 1 },
    });
  }

  /** Returns the first admin user (_id only). Used as a default receiverId for support messages. */
  async findAdmin(): Promise<{ _id: { toString(): string } } | null> {
    await this.connect();
    return User.findOne({ role: "admin" }).select("_id").lean() as never;
  }

  /** Returns all admin and staff user IDs. Used for broadcasting internal notifications. */
  async findAdminsAndStaff(): Promise<{ _id: { toString(): string } }[]> {
    await this.connect();
    return User.find({ role: { $in: ["admin", "staff"] } })
      .select("_id")
      .lean() as never;
  }

  /** Batch fetch users by an array of IDs. Returns name, email, role fields. */
  async findByIds(
    ids: string[]
  ): Promise<{ _id: { toString(): string }; name: string; email: string; role: string }[]> {
    await this.connect();
    return User.find({ _id: { $in: ids } })
      .select("name email role")
      .lean() as never;
  }

  /** Users filtered by kycStatus for the admin KYC review queue (providers + clients). */
  async findUsersByKycStatus(
    status: string | string[],
    opts: { roles?: string[]; sort?: 1 | -1; limit?: number } = {}
  ): Promise<Array<{
    _id: { toString(): string }; name: string; email: string; role: string;
    kycStatus: string; kycDocuments: { type: string; url: string; uploadedAt: string }[];
    kycRejectionReason?: string | null; createdAt: string | Date;
  }>> {
    await this.connect();
    const statusFilter = Array.isArray(status) ? { $in: status } : status;
    const roleFilter = opts.roles ?? ["provider", "client"];
    let q = User.find({ role: { $in: roleFilter }, kycStatus: statusFilter })
      .select("name email role kycStatus kycDocuments kycRejectionReason createdAt")
      .sort({ createdAt: opts.sort ?? -1 });
    if (opts.limit) q = q.limit(opts.limit);
    return q.lean() as never;
  }

  /** @deprecated Use findUsersByKycStatus instead */
  async findProvidersByKycStatus(
    status: string | string[],
    opts: { sort?: 1 | -1; limit?: number } = {}
  ) {
    return this.findUsersByKycStatus(status, { ...opts, roles: ["provider"] });
  }

  // ─── Provider Approval ───────────────────────────────────────────────────

  async updateApprovalStatus(
    userId: string,
    status: "pending_approval" | "approved" | "rejected"
  ): Promise<UserDocument | null> {
    return this.updateById(userId, { approvalStatus: status });
  }

  // ─── Staff Management ─────────────────────────────────────────────────────

  async findAllStaff(): Promise<UserDocument[]> {
    await this.connect();
    return User.find({ role: "staff" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean() as unknown as UserDocument[];
  }

  async createStaffUser(data: {
    name: string;
    email: string;
    password: string;
    capabilities: string[];
  }): Promise<UserDocument> {
    await this.connect();
    const doc = new User({
      name: data.name,
      email: data.email,
      password: data.password,
      role: "staff",
      capabilities: data.capabilities,
      isVerified: true,
      approvalStatus: "approved",
    });
    return doc.save();
  }

  async updateStaff(
    id: string,
    updates: { capabilities?: string[]; isSuspended?: boolean }
  ): Promise<UserDocument | null> {
    return this.updateById(id, updates);
  }

  // ─── Role & Capability Management ────────────────────────────────────────

  async updateRoleAndCapabilities(
    id: string,
    updates: { role?: string; capabilities?: string[] }
  ): Promise<UserDocument | null> {
    return this.updateById(id, { $set: updates });
  }

  // ─── Search ───────────────────────────────────────────────────────────────

  /** Full-text search across name and email for admin global search. */
  async searchForAdmin(
    regex: RegExp
  ): Promise<Array<{ _id: unknown; name: string; email: string; role: string }>> {
    await this.connect();
    return User.find({ $or: [{ name: regex }, { email: regex }] })
      .limit(5)
      .select("_id name email role")
      .lean() as never;
  }

  // ─── PWA Push Subscriptions ───────────────────────────────────────────────

  /** Upsert a push subscription for a user (keyed on endpoint). */
  async upsertPushSubscription(
    userId: string,
    sub: PushSubscriptionRecord
  ): Promise<void> {
    await this.connect();
    // Remove any existing entry with the same endpoint, then add the new one
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint: sub.endpoint } },
    });
    await User.findByIdAndUpdate(userId, {
      $push: { pushSubscriptions: sub },
    });
  }

  /** Remove a push subscription by endpoint. */
  async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    await this.connect();
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint } },
    });
  }

  /** Fetch all push subscriptions for a user. */
  async getPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    await this.connect();
    const doc = await User.findById(userId).select("+pushSubscriptions").lean();
    return (doc as unknown as { pushSubscriptions?: PushSubscriptionRecord[] })
      ?.pushSubscriptions ?? [];
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────

  async submitKyc(
    userId: string,
    documents: { type: string; url: string; uploadedAt: Date }[]
  ): Promise<{ name: string; role: string } | null> {
    await this.connect();
    return User.findByIdAndUpdate(
      userId,
      { kycStatus: "pending", kycDocuments: documents, kycRejectionReason: null },
      { new: true }
    )
      .select("name role")
      .lean() as unknown as { name: string; role: string } | null;
  }

  async getKycStatus(
    userId: string
  ): Promise<{ kycStatus: string; kycDocuments: unknown[]; kycRejectionReason: string | null } | null> {
    await this.connect();
    return User.findById(userId)
      .select("kycStatus kycDocuments kycRejectionReason")
      .lean() as unknown as { kycStatus: string; kycDocuments: unknown[]; kycRejectionReason: string | null } | null;
  }

  // ─── Fraud / Risk ─────────────────────────────────────────────────────────

  async findSuspiciousUsers(limit = 100): Promise<unknown[]> {
    await this.connect();
    return User.find({
      $or: [
        { fraudFlags: { $exists: true, $not: { $size: 0 } } },
        { flaggedJobCount: { $gte: 2 } },
      ],
      isDeleted: { $ne: true },
    })
      .select("name email role kycStatus isVerified isSuspended flaggedJobCount fraudFlags createdAt")
      .sort({ flaggedJobCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();
  }

  // ─── Duplicate Detection ──────────────────────────────────────────────────

  /**
   * Finds potential duplicate users based on phone, email local prefix, or first name word.
   * Excludes soft-deleted accounts and the source user.
   */
  async findPotentialDuplicates(
    excludeId: string,
    orClauses: Record<string, unknown>[]
  ): Promise<Array<{ _id: unknown; name: string; email: string; role: string; isVerified: boolean; createdAt: Date; phone?: string | null }>> {
    await this.connect();
    return User.find({
      _id: { $ne: excludeId },
      isDeleted: { $ne: true },
      $or: orClauses,
    })
      .select("name email role isVerified createdAt phone")
      .limit(10)
      .lean() as never;
  }
}

export const userRepository = new UserRepository();
