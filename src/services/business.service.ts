import { businessOrganizationRepository } from "@/repositories/businessOrganization.repository";
import { businessMemberRepository } from "@/repositories/businessMember.repository";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import type {
  IBusinessOrganization,
  IBusinessMember,
  BusinessMemberRole,
  MonthlyExpenseRow,
  ProviderPerformanceRow,
  BudgetAlertRow,
} from "@/types";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export class BusinessService {
  // ─── Organization ─────────────────────────────────────────────────────────

  async getOrCreateOrg(ownerId: string): Promise<IBusinessOrganization | null> {
    return businessOrganizationRepository.findByOwner(ownerId);
  }

  async createOrg(
    ownerId: string,
    data: { name: string; type?: string; defaultMonthlyBudget?: number }
  ): Promise<IBusinessOrganization> {
    const existing = await businessOrganizationRepository.findByOwner(ownerId);
    if (existing) throw new ConflictError("You already have a business organization.");

    const org = await businessOrganizationRepository.createOrg({
      ownerId,
      name: data.name,
      type: data.type ?? "company",
      defaultMonthlyBudget: data.defaultMonthlyBudget ?? 0,
    });

    await businessMemberRepository.addMember({
      orgId: org._id.toString(),
      userId: ownerId,
      role: "owner",
      invitedBy: ownerId,
    });

    return org;
  }

  async updateOrg(
    orgId: string,
    requestingUserId: string,
    data: Partial<{ name: string; type: string; logo: string; defaultMonthlyBudget: number }>
  ): Promise<IBusinessOrganization> {
    await this.requireManagerAccess(orgId, requestingUserId);
    const updated = await businessOrganizationRepository.updateOrgDetails(orgId, data);
    if (!updated) throw new NotFoundError("Organization not found.");
    return updated;
  }

  // ─── Locations ────────────────────────────────────────────────────────────

  async addLocation(
    orgId: string,
    requestingUserId: string,
    location: {
      label: string;
      address: string;
      coordinates?: { lat: number; lng: number };
      monthlyBudget?: number;
      alertThreshold?: number;
    }
  ): Promise<IBusinessOrganization> {
    await this.requireManagerAccess(orgId, requestingUserId);
    const updated = await businessOrganizationRepository.addLocation(orgId, location);
    if (!updated) throw new NotFoundError("Organization not found.");
    return updated;
  }

  async updateLocation(
    orgId: string,
    locationId: string,
    requestingUserId: string,
    updates: Partial<{
      label: string;
      address: string;
      coordinates: { lat: number; lng: number };
      monthlyBudget: number;
      alertThreshold: number;
      isActive: boolean;
    }>
  ): Promise<IBusinessOrganization> {
    await this.requireManagerAccess(orgId, requestingUserId);
    const updated = await businessOrganizationRepository.updateLocation(orgId, locationId, updates);
    if (!updated) throw new NotFoundError("Organization or location not found.");
    return updated;
  }

  async removeLocation(
    orgId: string,
    locationId: string,
    requestingUserId: string
  ): Promise<IBusinessOrganization> {
    await this.requireManagerAccess(orgId, requestingUserId);
    const updated = await businessOrganizationRepository.removeLocation(orgId, locationId);
    if (!updated) throw new NotFoundError("Organization or location not found.");
    return updated;
  }

  // ─── Members ──────────────────────────────────────────────────────────────

  async getMembers(orgId: string, requestingUserId: string): Promise<IBusinessMember[]> {
    await this.requireMemberAccess(orgId, requestingUserId);
    return businessMemberRepository.findByOrg(orgId);
  }

  async addMember(
    orgId: string,
    requestingUserId: string,
    data: { userId: string; role: BusinessMemberRole; locationAccess?: string[] }
  ): Promise<IBusinessMember> {
    await this.requireManagerAccess(orgId, requestingUserId);
    if (data.role === "owner") throw new ValidationError("Cannot assign owner role via invite.");
    const existing = await businessMemberRepository.findMembership(orgId, data.userId);
    if (existing) throw new ConflictError("User is already a member of this organization.");
    return businessMemberRepository.addMember({
      orgId,
      userId: data.userId,
      role: data.role,
      invitedBy: requestingUserId,
      locationAccess: data.locationAccess,
    });
  }

  async updateMember(
    orgId: string,
    memberId: string,
    requestingUserId: string,
    data: { role?: BusinessMemberRole; locationAccess?: string[] }
  ): Promise<IBusinessMember> {
    await this.requireManagerAccess(orgId, requestingUserId);
    if (data.role === "owner") throw new ValidationError("Cannot reassign owner role.");
    let updated: IBusinessMember | null = null;
    if (data.role) updated = await businessMemberRepository.updateRole(memberId, data.role);
    if (data.locationAccess !== undefined)
      updated = await businessMemberRepository.updateLocationAccess(memberId, data.locationAccess);
    if (!updated) throw new NotFoundError("Member not found.");
    return updated;
  }

  async removeMember(orgId: string, memberId: string, requestingUserId: string): Promise<void> {
    await this.requireManagerAccess(orgId, requestingUserId);
    await businessMemberRepository.deactivateMember(memberId);
  }

  // ─── Preferred Vendors ───────────────────────────────────────────────────

  async togglePreferredProvider(
    orgId: string,
    locationId: string,
    providerId: string,
    requestingUserId: string,
    add: boolean
  ): Promise<IBusinessOrganization> {
    await this.requireManagerAccess(orgId, requestingUserId);
    const updated = add
      ? await businessOrganizationRepository.addPreferredProvider(orgId, locationId, providerId)
      : await businessOrganizationRepository.removePreferredProvider(orgId, locationId, providerId);
    if (!updated) throw new NotFoundError("Organization or location not found.");
    return updated;
  }

  // ─── Budget Alerts ────────────────────────────────────────────────────────

  async getBudgetAlerts(
    orgId: string,
    requestingUserId: string
  ): Promise<BudgetAlertRow[]> {
    await this.requireMemberAccess(orgId, requestingUserId);
    const org = await businessOrganizationRepository.findById(orgId) as unknown as IBusinessOrganization | null;
    if (!org) return [];

    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) return [];

    await connectDB();
    const Transaction = mongoose.model("Transaction");
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthStart = new Date(`${currentMonth}-01T00:00:00.000Z`);

    // Total org spend this month (we don't have per-location job tagging yet so use total)
    const [totalResult]: { total: number }[] = await Transaction.aggregate([
      {
        $match: {
          payerId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
          status: "completed",
          createdAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalSpentThisMonth = totalResult?.total ?? 0;

    const alerts: BudgetAlertRow[] = org.locations
      .filter((l) => l.isActive && l.monthlyBudget > 0)
      .map((l) => {
        const threshold = (l as unknown as { alertThreshold?: number }).alertThreshold ?? 80;
        // Distribute org spend proportionally to per-location budget weight
        const totalOrgBudget = org.locations.filter((x) => x.isActive && x.monthlyBudget > 0)
          .reduce((s, x) => s + x.monthlyBudget, 0);
        const locationShare = totalOrgBudget > 0 ? l.monthlyBudget / totalOrgBudget : 0;
        const spentThisMonth = totalSpentThisMonth * locationShare;
        const pct = (spentThisMonth / l.monthlyBudget) * 100;
        const status: BudgetAlertRow["status"] =
          pct >= 90 ? "critical" : pct >= threshold ? "warning" : "ok";
        return {
          locationId: l._id.toString(),
          locationLabel: l.label,
          budgetTotal: l.monthlyBudget,
          spentThisMonth,
          pct: Math.round(pct * 10) / 10,
          status,
          threshold,
        };
      });

    return alerts;
  }

  // ─── Monthly Expenses (with category breakdown + MoM trend) ──────────────

  async getMonthlyExpenses(
    orgId: string,
    requestingUserId: string,
    months = 12
  ): Promise<MonthlyExpenseRow[]> {
    await this.requireMemberAccess(orgId, requestingUserId);
    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) return [];

    await connectDB();
    const Job = mongoose.model("Job");
    const Transaction = mongoose.model("Transaction");

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    // Join transactions → jobs to get category info
    const rows: {
      _id: { month: string };
      totalSpend: number;
      jobCount: number;
      categories: { category: string; amount: number }[];
    }[] = await Transaction.aggregate([
      {
        $match: {
          payerId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
          status: "completed",
          createdAt: { $gte: since },
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } } },
          totalSpend: { $sum: "$amount" },
          jobCount: { $sum: 1 },
          categories: {
            $push: { category: { $ifNull: ["$job.category", "Other"] }, amount: "$amount" },
          },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    // Aggregate category array into a map per row
    const result: MonthlyExpenseRow[] = rows.map((r) => {
      const catMap: Record<string, number> = {};
      for (const c of r.categories) {
        catMap[c.category] = (catMap[c.category] ?? 0) + c.amount;
      }
      return {
        month: r._id.month,
        locationId: null,
        locationLabel: "All Locations",
        totalSpend: r.totalSpend,
        jobCount: r.jobCount,
        categoryBreakdown: catMap,
        momChange: null, // filled in below
      };
    });

    // Compute month-over-month change
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1].totalSpend;
      const curr = result[i].totalSpend;
      result[i].momChange = prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : null;
    }

    return result;
  }

  // ─── Enhanced Provider Performance ────────────────────────────────────────

  async getProviderPerformance(
    orgId: string,
    requestingUserId: string
  ): Promise<ProviderPerformanceRow[]> {
    await this.requireMemberAccess(orgId, requestingUserId);
    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) return [];

    const org = await businessOrganizationRepository.findById(orgId) as unknown as IBusinessOrganization | null;
    // Build set of all preferred provider IDs across all locations
    const preferredSet = new Set<string>(
      (org?.locations ?? []).flatMap(
        (l) => ((l as unknown as { preferredProviderIds?: string[] }).preferredProviderIds ?? []).map(String)
      )
    );

    await connectDB();
    const Job = mongoose.model("Job");

    const rows: {
      _id: string;
      providerName: string;
      providerAvatar: string | null;
      completedJobs: number;
      totalAssigned: number;
      avgRating: number;
      totalSpend: number;
      delayedJobs: number;
      disputeCount: number;
    }[] = await Job.aggregate([
      {
        $match: {
          clientId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
          status: { $in: ["completed", "in_progress", "assigned", "disputed"] },
          providerId: { $ne: null },
        },
      },
      {
        $lookup: {
          from: "reviews",
          let: { jid: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$jobId", "$$jid"] } } }],
          as: "review",
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: { jid: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$jobId", "$$jid"] }, { $eq: ["$status", "completed"] }] } } },
          ],
          as: "transaction",
        },
      },
      {
        $lookup: {
          from: "disputes",
          let: { jid: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$jobId", "$$jid"] } } }],
          as: "disputes",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "providerId",
          foreignField: "_id",
          as: "provider",
        },
      },
      { $unwind: { path: "$provider", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$providerId",
          providerName:   { $first: "$provider.name" },
          providerAvatar: { $first: "$provider.avatar" },
          completedJobs:  { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          totalAssigned:  { $sum: 1 },
          avgRating: {
            $avg: {
              $cond: [{ $gt: [{ $size: "$review" }, 0] }, { $arrayElemAt: ["$review.rating", 0] }, null],
            },
          },
          totalSpend: {
            $sum: {
              $cond: [
                { $gt: [{ $size: "$transaction" }, 0] },
                { $arrayElemAt: ["$transaction.amount", 0] },
                0,
              ],
            },
          },
          // Delayed = job moved to in_progress after scheduleDate
          delayedJobs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["in_progress", "completed"]] },
                    { $gt: ["$updatedAt", "$scheduleDate"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          disputeCount: { $sum: { $size: "$disputes" } },
        },
      },
      { $sort: { completedJobs: -1 } },
    ]);

    return rows.map((r) => {
      const avgRating = Math.round((r.avgRating ?? 0) * 10) / 10;
      const completionRate = r.totalAssigned > 0 ? r.completedJobs / r.totalAssigned : 0;
      const delayFrequency =
        r.totalAssigned > 0 ? Math.round((r.delayedJobs / r.totalAssigned) * 1000) / 10 : 0;
      // Cost efficiency: (avgRating/5 * completionRate) / (normalised cost). Higher = better.
      const avgCost = r.completedJobs > 0 ? r.totalSpend / r.completedJobs : 0;
      const costEfficiencyScore =
        avgCost > 0
          ? Math.min(100, Math.round(((avgRating / 5) * completionRate * 100000) / avgCost))
          : 0;

      return {
        providerId: r._id.toString(),
        providerName: r.providerName,
        providerAvatar: r.providerAvatar ?? null,
        completedJobs: r.completedJobs,
        avgRating,
        totalSpend: r.totalSpend,
        delayFrequency,
        disputeCount: r.disputeCount,
        costEfficiencyScore,
        isPreferred: preferredSet.has(r._id.toString()),
      };
    });
  }

  // ─── Jobs by Location (centralized reporting) ─────────────────────────────

  async getJobsByLocation(
    orgId: string,
    requestingUserId: string,
    locationId?: string
  ): Promise<{ location: string; jobs: unknown[] }[]> {
    await this.requireMemberAccess(orgId, requestingUserId);
    const org = await businessOrganizationRepository.findById(orgId) as unknown as IBusinessOrganization | null;
    if (!org) return [];

    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) return [];

    await connectDB();
    const Job = mongoose.model("Job");

    // Filter to specific location address if given
    const targetLocations = locationId
      ? org.locations.filter((l) => l._id.toString() === locationId)
      : org.locations.filter((l) => l.isActive);

    const results = await Promise.all(
      targetLocations.map(async (loc) => {
        const jobs = await Job.find({
          clientId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
          location: { $regex: loc.address.slice(0, 20), $options: "i" },
          status: { $in: ["open", "assigned", "in_progress", "completed"] },
        })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate("providerId", "name avatar")
          .lean();
        return { location: loc.label, jobs };
      })
    );

    return results;
  }

  // ─── CSV Report Data ──────────────────────────────────────────────────────

  async getExpenseReportRows(
    orgId: string,
    requestingUserId: string,
    months = 12
  ): Promise<{ month: string; category: string; totalSpend: number; jobCount: number }[]> {
    await this.requireManagerAccess(orgId, requestingUserId);
    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) return [];

    await connectDB();
    const Transaction = mongoose.model("Transaction");

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const rows: { _id: { month: string; category: string }; totalSpend: number; jobCount: number }[] =
      await Transaction.aggregate([
        {
          $match: {
            payerId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
            status: "completed",
            createdAt: { $gte: since },
          },
        },
        {
          $lookup: {
            from: "jobs",
            localField: "jobId",
            foreignField: "_id",
            as: "job",
          },
        },
        { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              category: { $ifNull: ["$job.category", "Other"] },
            },
            totalSpend: { $sum: "$amount" },
            jobCount:   { $sum: 1 },
          },
        },
        { $sort: { "_id.month": 1, "_id.category": 1 } },
      ]);

    return rows.map((r) => ({
      month: r._id.month,
      category: r._id.category,
      totalSpend: r.totalSpend,
      jobCount: r.jobCount,
    }));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async requireManagerAccess(orgId: string, userId: string): Promise<void> {
    const membership = await businessMemberRepository.findMembership(orgId, userId);
    if (!membership || !["owner", "manager"].includes(membership.role)) {
      throw new ForbiddenError("Manager or owner access required.");
    }
  }

  private async requireMemberAccess(orgId: string, userId: string): Promise<void> {
    const membership = await businessMemberRepository.findMembership(orgId, userId);
    if (!membership) {
      throw new ForbiddenError("You are not a member of this organization.");
    }
  }
}

export const businessService = new BusinessService();
