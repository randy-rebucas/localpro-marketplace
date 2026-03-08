import mongoose, { type PipelineStage } from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Job from "@/models/Job";
import ProviderProfile from "@/models/ProviderProfile";
import Transaction from "@/models/Transaction";
import "@/models/User";

export interface EmploymentStats {
  totalProviders: number;
  newProvidersThisMonth: number;
  activeJobs: number;
  completedJobs: number;
  totalIncomeGenerated: number;
  avgProviderIncome: number;
}

export const PESO_JOB_TAGS = ["peso", "lgu_project", "gov_program", "emergency", "internship"] as const;

export interface OfficeReportData {
  stats: EmploymentStats;
  tagBreakdown: { tag: string; count: number }[];
  topSkills: { skill: string; count: number }[];
  topCategories: { category: string; count: number }[];
}

export interface WorkforceRegistryFilters {
  barangay?: string;
  skill?: string;
  verificationTag?: string;
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface WorkforceRegistryEntry {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
  barangay?: string | null;
  skills: string[];
  certifications: unknown[];
  pesoVerificationTags: string[];
  pesoReferredBy?: string | null;
  livelihoodProgram?: string | null;
  accountSubtype: string;
  avgRating: number;
  completedJobCount: number;
  completionRate: number;
  isLocalProCertified: boolean;
}

export class PesoRepository {
  private async connect() {
    await connectDB();
  }

  async getEmploymentStats(): Promise<EmploymentStats> {
    await this.connect();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProviders,
      newProvidersThisMonth,
      activeJobs,
      completedJobs,
      incomeAgg,
    ] = await Promise.all([
      User.countDocuments({ role: "provider", isDeleted: false }),
      User.countDocuments({
        role: "provider",
        isDeleted: false,
        createdAt: { $gte: startOfMonth },
      }),
      Job.countDocuments({ status: { $in: ["open", "assigned", "in_progress"] } }),
      Job.countDocuments({ status: "completed" }),
      Transaction.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$netAmount" } } },
      ]),
    ]);

    const totalIncomeGenerated = incomeAgg[0]?.total ?? 0;
    const avgProviderIncome = totalProviders > 0
      ? Math.round(totalIncomeGenerated / totalProviders)
      : 0;

    return {
      totalProviders,
      newProvidersThisMonth,
      activeJobs,
      completedJobs,
      totalIncomeGenerated,
      avgProviderIncome,
    };
  }

  async getTopSkills(limit = 10): Promise<{ skill: string; count: number }[]> {
    await this.connect();
    const result = await ProviderProfile.aggregate([
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { skill: "$_id", count: 1, _id: 0 } },
    ]);
    return result;
  }

  async getTopCategories(limit = 10): Promise<{ category: string; count: number }[]> {
    await this.connect();
    const result = await Job.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { category: "$_id", count: 1, _id: 0 } },
    ]);
    return result;
  }

  /**
   * Office-scoped report stats.
   * Only counts providers referred by this office and jobs posted by this office
   * that carry a PESO-programme tag (peso | lgu_project | gov_program | emergency | internship).
   */
  async getOfficeReportStats(
    officerIds: string[],
    limit = 10
  ): Promise<OfficeReportData> {
    await this.connect();

    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const oids         = officerIds.map((id) => new mongoose.Types.ObjectId(id));

    // Scoped filters
    const jobFilter      = { pesoPostedBy: { $in: oids }, jobTags: { $in: PESO_JOB_TAGS as unknown as string[] } };
    const providerFilter = { pesoReferredBy: { $in: oids } };

    const [
      totalProviders,
      newProvidersThisMonth,
      activeJobs,
      completedJobs,
      tagBreakdown,
      topSkills,
      topCategories,
      incomeAgg,
    ] = await Promise.all([
      ProviderProfile.countDocuments(providerFilter),

      ProviderProfile.countDocuments({ ...providerFilter, createdAt: { $gte: startOfMonth } }),

      Job.countDocuments({ ...jobFilter, status: { $in: ["open", "assigned", "in_progress"] } }),

      Job.countDocuments({ ...jobFilter, status: "completed" }),

      // Jobs per PESO tag
      Job.aggregate([
        { $match: { pesoPostedBy: { $in: oids }, jobTags: { $in: PESO_JOB_TAGS as unknown as string[] } } },
        { $unwind: "$jobTags" },
        { $match: { jobTags: { $in: PESO_JOB_TAGS as unknown as string[] } } },
        { $group: { _id: "$jobTags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { tag: "$_id", count: 1, _id: 0 } },
      ]),

      // Top skills from PESO-referred providers
      ProviderProfile.aggregate([
        { $match: providerFilter },
        { $unwind: "$skills" },
        { $group: { _id: "$skills", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { skill: "$_id", count: 1, _id: 0 } },
      ]),

      // Top categories from PESO-posted jobs
      Job.aggregate([
        { $match: jobFilter },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { category: "$_id", count: 1, _id: 0 } },
      ]),

      // Income from transactions linked to PESO-completed jobs
      Job.aggregate([
        { $match: { ...jobFilter, status: "completed" } },
        {
          $lookup: {
            from: "transactions",
            localField: "_id",
            foreignField: "jobId",
            as: "tx",
          },
        },
        { $unwind: "$tx" },
        { $match: { "tx.status": "completed" } },
        { $group: { _id: null, total: { $sum: "$tx.netAmount" } } },
      ]),
    ]);

    const totalIncomeGenerated = incomeAgg[0]?.total ?? 0;
    const avgProviderIncome    = totalProviders > 0
      ? Math.round(totalIncomeGenerated / totalProviders)
      : 0;

    return {
      stats: {
        totalProviders,
        newProvidersThisMonth,
        activeJobs,
        completedJobs,
        totalIncomeGenerated,
        avgProviderIncome,
      },
      tagBreakdown,
      topSkills,
      topCategories,
    };
  }

  async getProviderRegistry(
    filters: WorkforceRegistryFilters = {}
  ): Promise<{ data: WorkforceRegistryEntry[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.connect();

    const { page = 1, limit = 20, barangay, skill, verificationTag, minRating } = filters;
    const skip = (page - 1) * limit;

    const profileMatch: Record<string, unknown> = {};
    if (barangay) profileMatch.barangay = { $regex: barangay, $options: "i" };
    if (skill) profileMatch.skills = { $elemMatch: { $regex: skill, $options: "i" } };
    if (verificationTag) profileMatch.pesoVerificationTags = verificationTag;
    if (minRating !== undefined) profileMatch.avgRating = { $gte: minRating };

    const pipeline: PipelineStage[] = [
      { $match: profileMatch },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: { "user.role": "provider", "user.isDeleted": false } },
      {
        $project: {
          userId: "$user._id",
          name: "$user.name",
          email: "$user.email",
          avatar: "$user.avatar",
          barangay: 1,
          skills: 1,
          certifications: 1,
          pesoVerificationTags: 1,
          pesoReferredBy: 1,
          livelihoodProgram: 1,
          accountSubtype: 1,
          avgRating: 1,
          completedJobCount: 1,
          completionRate: 1,
          isLocalProCertified: 1,
        },
      },
      { $sort: { completedJobCount: -1 } },
    ];

    const [data, countResult] = await Promise.all([
      ProviderProfile.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      ProviderProfile.aggregate([...pipeline, { $count: "total" }]),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: data as WorkforceRegistryEntry[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOfficeByOfficerId(userId: string) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    return PesoOffice.findOne({
      $or: [{ headOfficerId: userId }, { officerIds: userId }],
    })
      .populate("headOfficerId", "name email avatar")
      .populate("officerIds", "name email avatar createdAt")
      .lean();
  }

  async findOfficeByHeadOfficer(userId: string) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    return PesoOffice.findOne({ headOfficerId: userId }).lean();
  }

  async addOfficerToOffice(officeId: string, officerUserId: string) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    return PesoOffice.findByIdAndUpdate(
      officeId,
      { $addToSet: { officerIds: officerUserId } },
      { new: true }
    ).lean();
  }

  async removeOfficerFromOffice(officeId: string, officerUserId: string) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    return PesoOffice.findByIdAndUpdate(
      officeId,
      { $pull: { officerIds: officerUserId } },
      { new: true }
    ).lean();
  }

  async listAllOffices(filter: { isActive?: boolean } = {}) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    const query: Record<string, unknown> = {};
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    return PesoOffice.find(query)
      .populate("headOfficerId", "name email avatar createdAt")
      .populate("officerIds", "name email")
      .sort({ createdAt: -1 })
      .lean();
  }

  async toggleOfficeActive(officeId: string, isActive: boolean) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    return PesoOffice.findByIdAndUpdate(officeId, { isActive }, { new: true }).lean();
  }

  async createOffice(data: {
    officeName: string;
    municipality: string;
    region: string;
    contactEmail: string;
    headOfficerId: string;
  }) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    const office = await PesoOffice.create(data);
    return PesoOffice.findById(office._id)
      .populate("headOfficerId", "name email avatar")
      .populate("officerIds", "name email")
      .lean();
  }

  async updateOffice(officeId: string, data: Record<string, unknown>) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    return PesoOffice.findByIdAndUpdate(officeId, { $set: data }, { new: true })
      .populate("headOfficerId", "name email avatar")
      .populate("officerIds", "name email")
      .lean();
  }

  async deleteOffice(officeId: string) {
    await this.connect();
    const PesoOffice = (await import("@/models/PesoOffice")).default;
    return PesoOffice.findByIdAndDelete(officeId).lean();
  }
}

export const pesoRepository = new PesoRepository();
