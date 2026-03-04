import { BaseRepository } from "./base.repository";
import BusinessMember, { BusinessMemberDocument } from "@/models/BusinessMember";
import { connectDB } from "@/lib/db";
import type { IBusinessMember, BusinessMemberRole } from "@/types";

class BusinessMemberRepository extends BaseRepository<BusinessMemberDocument> {
  constructor() {
    super(BusinessMember);
  }

  /** All active members of an org, populated with user name/email/avatar. */
  async findByOrg(orgId: string): Promise<IBusinessMember[]> {
    await connectDB();
    return BusinessMember.find({ orgId, isActive: true })
      .populate("userId", "name email avatar")
      .lean() as unknown as IBusinessMember[];
  }

  /** Find the membership record for a given user in an org. */
  async findMembership(
    orgId: string,
    userId: string
  ): Promise<IBusinessMember | null> {
    await connectDB();
    return BusinessMember.findOne({ orgId, userId, isActive: true })
      .lean() as unknown as IBusinessMember | null;
  }

  /** All active org memberships for a user (they can belong to multiple orgs). */
  async findByUser(userId: string): Promise<IBusinessMember[]> {
    await connectDB();
    return BusinessMember.find({ userId, isActive: true })
      .populate("orgId", "name type logo")
      .lean() as unknown as IBusinessMember[];
  }

  async addMember(data: {
    orgId: string;
    userId: string;
    role: BusinessMemberRole;
    invitedBy: string;
    locationAccess?: string[];
  }): Promise<IBusinessMember> {
    await connectDB();
    const doc = await BusinessMember.create({ ...data, isActive: true });
    return doc.toObject() as unknown as IBusinessMember;
  }

  async updateRole(
    memberId: string,
    role: BusinessMemberRole
  ): Promise<IBusinessMember | null> {
    await connectDB();
    return BusinessMember.findByIdAndUpdate(
      memberId,
      { $set: { role } },
      { new: true }
    ).lean() as unknown as IBusinessMember | null;
  }

  async updateLocationAccess(
    memberId: string,
    locationAccess: string[]
  ): Promise<IBusinessMember | null> {
    await connectDB();
    return BusinessMember.findByIdAndUpdate(
      memberId,
      { $set: { locationAccess } },
      { new: true }
    ).lean() as unknown as IBusinessMember | null;
  }

  async deactivateMember(memberId: string): Promise<void> {
    await connectDB();
    await BusinessMember.findByIdAndUpdate(memberId, { $set: { isActive: false } });
  }

  /** Array of userIds belonging to an org (useful for analytics queries). */
  async getMemberUserIds(orgId: string): Promise<string[]> {
    await connectDB();
    const members = await BusinessMember.find({ orgId, isActive: true })
      .select("userId")
      .lean();
    return members.map((m) => m.userId.toString());
  }
}

export const businessMemberRepository = new BusinessMemberRepository();
