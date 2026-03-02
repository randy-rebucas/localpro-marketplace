import { connectDB } from "@/lib/db";
import Announcement from "@/models/Announcement";
import type { AnnouncementTarget, AnnouncementType } from "@/types";

export const announcementRepository = {
  /** Active announcements visible to a given role (respects expiry). */
  async findActiveForRole(role: string) {
    await connectDB();
    return Announcement.find({
      isActive: true,
      targetRoles: { $in: [role, "all"] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .sort({ createdAt: -1 })
      .lean();
  },

  /** All announcements (admin view). */
  async findAll() {
    await connectDB();
    return Announcement.find().sort({ createdAt: -1 }).lean();
  },

  async findById(id: string) {
    await connectDB();
    return Announcement.findById(id).lean();
  },

  async create(data: {
    title: string;
    message: string;
    type: AnnouncementType;
    targetRoles: AnnouncementTarget[];
    isActive: boolean;
    expiresAt?: Date | null;
    createdBy: string;
  }) {
    await connectDB();
    const doc = await Announcement.create(data);
    return doc.toObject();
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      message: string;
      type: AnnouncementType;
      targetRoles: AnnouncementTarget[];
      isActive: boolean;
      expiresAt: Date | null;
    }>
  ) {
    await connectDB();
    return Announcement.findByIdAndUpdate(id, data, { new: true }).lean();
  },

  async delete(id: string) {
    await connectDB();
    return Announcement.findByIdAndDelete(id).lean();
  },
};
