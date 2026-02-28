import User from "@/models/User";
import type { UserDocument } from "@/models/User";
import { BaseRepository } from "./base.repository";

export class UserRepository extends BaseRepository<UserDocument> {
  constructor() {
    super(User);
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

  async findAll(filter: Record<string, unknown> = {}): Promise<UserDocument[]> {
    await this.connect();
    return User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean() as unknown as UserDocument[];
  }

  async findPaginated(
    filter: Record<string, unknown> = {},
    page: number,
    limit: number
  ): Promise<{ users: UserDocument[]; total: number }> {
    await this.connect();
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean() as unknown as Promise<UserDocument[]>,
      User.countDocuments(filter),
    ]);
    return { users, total };
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

  /** Providers filtered by kycStatus for the admin KYC review queue. */
  async findProvidersByKycStatus(
    status: string | string[],
    opts: { sort?: 1 | -1; limit?: number } = {}
  ): Promise<Array<{
    _id: { toString(): string }; name: string; email: string;
    kycStatus: string; kycDocuments: { type: string; url: string; uploadedAt: string }[];
    kycRejectionReason?: string | null; createdAt: string | Date;
  }>> {
    await this.connect();
    const statusFilter = Array.isArray(status) ? { $in: status } : status;
    let q = User.find({ role: "provider", kycStatus: statusFilter })
      .select("name email kycStatus kycDocuments kycRejectionReason createdAt")
      .sort({ createdAt: opts.sort ?? -1 });
    if (opts.limit) q = q.limit(opts.limit);
    return q.lean() as never;
  }

  // ─── Provider Approval ───────────────────────────────────────────────────

  async updateApprovalStatus(
    userId: string,
    status: "pending_approval" | "approved" | "rejected"
  ): Promise<UserDocument | null> {
    return this.updateById(userId, { approvalStatus: status });
  }
}

export const userRepository = new UserRepository();
