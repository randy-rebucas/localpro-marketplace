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
import { BASE_COMMISSION_RATE } from "@/lib/commission";
import { isAtLocationLimit, getLocationLimit, isAtMemberLimit, getMemberLimit, isAtJobLimit, getJobLimit, JOB_LIMITS, PLAN_LABELS, hasPrioritySupportAccess, getBusinessCommissionRate } from "@/lib/businessPlan";
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

    const currentOrg = await businessOrganizationRepository.findOrgById(orgId);
    if (!currentOrg) throw new NotFoundError("Organization not found.");

    if (isAtLocationLimit(currentOrg.plan, currentOrg.locations.length)) {
      const limit = getLocationLimit(currentOrg.plan);
      const label = PLAN_LABELS[currentOrg.plan];
      throw new ForbiddenError(
        `Your ${label} plan allows up to ${limit} branch${limit === 1 ? "" : "es"}. Upgrade your plan to add more locations.`
      );
    }

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

    const currentOrg = await businessOrganizationRepository.findOrgById(orgId);
    if (!currentOrg) throw new NotFoundError("Organization not found.");

    const activeMembers = await businessMemberRepository.findByOrg(orgId);
    if (isAtMemberLimit(currentOrg.plan, activeMembers.length)) {
      const limit = getMemberLimit(currentOrg.plan);
      const label = PLAN_LABELS[currentOrg.plan];
      throw new ForbiddenError(
        `Your ${label} plan allows up to ${limit} team member${limit === 1 ? "" : "s"}. Upgrade your plan to invite more.`
      );
    }

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
    // H10: Verify the member record belongs to this org before deactivating
    // to prevent cross-organization deactivation attacks
    const member = await businessMemberRepository.findById(memberId) as { orgId?: { toString(): string } } | null;
    if (!member || member.orgId?.toString() !== orgId) {
      throw new NotFoundError("Member not found in this organization");
    }
    await businessMemberRepository.deactivateMember(memberId);
  }

  /** Search a client user by email — used for the invite-by-email flow. */
  async searchUserByEmail(
    email: string,
    orgId: string,
    requestingUserId: string
  ): Promise<{ _id: string; name: string; email: string; avatar: string | null } | null> {
    await this.requireManagerAccess(orgId, requestingUserId);
    await connectDB();
    const User = mongoose.model("User");
    const user = await User.findOne({ email: email.toLowerCase().trim(), role: "client" })
      .select("_id name email avatar")
      .lean() as { _id: unknown; name: string; email: string; avatar?: string } | null;
    if (!user) return null;
    return {
      _id: (user._id as object).toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
    };
  }

  /** Org-scoped activity logs for all members — for the Activity tab. */
  async getMemberActivityLogs(
    orgId: string,
    requestingUserId: string,
    page = 1,
    limit = 20
  ): Promise<{
    logs: {
      logId: string;
      eventType: string;
      createdAt: Date;
      metadata: Record<string, unknown>;
      user: { id: string; name: string; avatar: string | null } | null;
      job: { id: string; title: string; category: string | null } | null;
    }[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.requireMemberAccess(orgId, requestingUserId);
    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    const org = await businessOrganizationRepository.findById(orgId);
    if (!org) return { logs: [], total: 0, page, limit };

    await connectDB();
    const ActivityLog = mongoose.model("ActivityLog");
    const ownerOid = new mongoose.Types.ObjectId(org.ownerId.toString());
    const memberOids = [
      ...memberUserIds.map((id) => new mongoose.Types.ObjectId(id)),
      ownerOid,
    ];

    const filter = { userId: { $in: memberOids } };
    const [total, docs] = await Promise.all([
      ActivityLog.countDocuments(filter),
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "name email avatar")
        .populate("jobId", "title category")
        .lean(),
    ]);

    const logs = (docs as Array<Record<string, unknown>>).map((d) => {
      const u = d.userId as Record<string, unknown> | null;
      const j = d.jobId as Record<string, unknown> | null;
      return {
        logId: (d._id as object).toString(),
        eventType: d.eventType as string,
        createdAt: d.createdAt as Date,
        metadata: (d.metadata as Record<string, unknown>) ?? {},
        user: u && typeof u === "object" && "name" in u
          ? { id: (u._id as object).toString(), name: u.name as string, avatar: (u.avatar as string | null) ?? null }
          : null,
        job: j && typeof j === "object" && "title" in j
          ? { id: (j._id as object).toString(), title: j.title as string, category: (j.category as string | null) ?? null }
          : null,
      };
    });
    return { logs, total, page, limit };
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
  // ─── Filtered Job List ────────────────────────────────────────────────────

  async listBusinessJobs(
    orgId: string,
    requestingUserId: string,
    opts: {
      locationId?: string;
      status?: string;
      category?: string;
      providerId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ jobs: unknown[]; total: number; pages: number; monthlyCount: number; jobLimit: number }> {
    await this.requireMemberAccess(orgId, requestingUserId);
    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) {
      const org = await businessOrganizationRepository.findOrgById(orgId);
      return { jobs: [], total: 0, pages: 0, monthlyCount: 0, jobLimit: JOB_LIMITS[org?.plan ?? "starter"] };
    }

    await connectDB();
    const Job = mongoose.model("Job");
    const { locationId, status, category, providerId, dateFrom, dateTo, page = 1, limit = 20 } = opts;

    const orgForLoc = locationId
      ? (await businessOrganizationRepository.findById(orgId) as unknown as IBusinessOrganization | null)
      : null;

    const match: Record<string, unknown> = {
      clientId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
    };

    if (locationId && orgForLoc) {
      const loc = orgForLoc.locations.find((l) => l._id.toString() === locationId);
      if (loc) match.location = { $regex: loc.address.slice(0, 20), $options: "i" };
    }
    if (status) match.status = status;
    if (category) match.category = { $regex: category, $options: "i" };
    if (providerId) {
      try { match.providerId = new mongoose.Types.ObjectId(providerId); } catch { /* ignore */ }
    }
    if (dateFrom || dateTo) {
      const df: Record<string, Date> = {};
      if (dateFrom) df.$gte = new Date(dateFrom);
      if (dateTo)   df.$lte = new Date(dateTo);
      match.createdAt = df;
    }

    // Monthly count (current calendar month, all statuses)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [total, jobs, monthlyCount, currentOrg] = await Promise.all([
      Job.countDocuments(match),
      Job.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("clientId", "name avatar")
        .populate("providerId", "name avatar")
        .lean(),
      Job.countDocuments({
        clientId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
        createdAt: { $gte: monthStart },
      }),
      businessOrganizationRepository.findOrgById(orgId),
    ]);

    const jobLimit = JOB_LIMITS[currentOrg?.plan ?? "starter"];

    return { jobs, total, pages: Math.ceil(total / limit), monthlyCount, jobLimit };
  }

  /** Count jobs posted by org members in the current calendar month. */
  async countMonthlyJobsForOrg(orgId: string): Promise<number> {
    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) return 0;
    await connectDB();
    const Job = mongoose.model("Job");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return Job.countDocuments({
      clientId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
      createdAt: { $gte: monthStart },
    });
  }

  /**
   * If the user is an active member of a business org, enforce the org's
   * monthly job posting limit. No-ops for regular (non-business) clients.
   */
  async checkBusinessJobMonthlyLimit(userId: string): Promise<void> {
    const memberships = await businessMemberRepository.findByUser(userId);
    if (!memberships || memberships.length === 0) return; // not a business client

    // Use the first active org (owner typically belongs to exactly one)
    const orgId = String(memberships[0].orgId);
    const org   = await businessOrganizationRepository.findOrgById(orgId);
    if (!org) return;

    const limit = getJobLimit(org.plan);
    if (limit === Infinity) return; // unlimited plan

    const monthlyCount = await this.countMonthlyJobsForOrg(orgId);
    if (isAtJobLimit(org.plan, monthlyCount)) {
      const label = PLAN_LABELS[org.plan];
      throw new ForbiddenError(
        `Your ${label} plan allows up to ${limit} job${limit === 1 ? "" : "s"} per month. Upgrade your plan to post more jobs this month.`
      );
    }
  }

  /**
   * If the user is an active member of a business org, enforce that the
   * org is on the Enterprise plan (required for Priority Support).
   * No-ops for regular (non-business) clients.
   */
  async checkPrioritySupportAccess(userId: string): Promise<void> {
    const memberships = await businessMemberRepository.findByUser(userId);
    if (!memberships || memberships.length === 0) return; // not a business client

    const orgId = String(memberships[0].orgId);
    const org   = await businessOrganizationRepository.findOrgById(orgId);
    if (!org) return;

    if (!hasPrioritySupportAccess(org.plan)) {
      const label = PLAN_LABELS[org.plan];
      throw new ForbiddenError(
        `Priority Support is available on the Enterprise plan. Your current plan is ${label}.`
      );
    }
  }

  async getBusinessJobDetail(
    orgId: string,
    requestingUserId: string,
    jobId: string
  ): Promise<unknown | null> {
    await this.requireMemberAccess(orgId, requestingUserId);
    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) return null;

    await connectDB();
    const Job = mongoose.model("Job");
    const job = await Job.findOne({
      _id: new mongoose.Types.ObjectId(jobId),
      clientId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .populate("clientId", "name avatar email")
      .populate("providerId", "name avatar")
      .lean();
    return job;
  }

  async getOrgRecurringSchedules(
    orgId: string,
    requestingUserId: string
  ): Promise<unknown[]> {
    await this.requireMemberAccess(orgId, requestingUserId);
    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) return [];

    await connectDB();
    const RecurringSchedule = mongoose.model("RecurringSchedule");
    return RecurringSchedule.find({
      clientId: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .sort({ createdAt: -1 })
      .populate("clientId", "name avatar")
      .lean();
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

  // ─── Location Detail ──────────────────────────────────────────────────────

  async getLocationDetail(orgId: string, locationId: string, requestingUserId: string) {
    await this.requireMemberAccess(orgId, requestingUserId);

    const org = await businessOrganizationRepository.findById(orgId) as unknown as IBusinessOrganization | null;
    if (!org) throw new NotFoundError("Organization not found.");

    const loc = org.locations.find((l) => l._id.toString() === locationId);
    if (!loc) throw new NotFoundError("Location not found.");

    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) {
      return { location: loc, kpi: { budgetUsedPct: 0, monthlySpend: 0, activeJobs: 0, completedJobs: 0, avgRating: 0 }, recentJobs: [], topProviders: [] };
    }

    await connectDB();
    const Job         = mongoose.model("Job");
    const Transaction = mongoose.model("Transaction");

    const memberOids  = memberUserIds.map((id) => new mongoose.Types.ObjectId(id));
    const monthStart  = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [jobStats, monthSpend, recentJobs, providerRows] = await Promise.all([
      Job.aggregate([
        { $match: { clientId: { $in: memberOids } } },
        { $group: {
          _id: null,
          active:    { $sum: { $cond: [{ $in: ["$status", ["open", "assigned", "in_progress"]] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        }},
      ]),
      Transaction.aggregate([
        { $match: { payerId: { $in: memberOids }, status: "completed", createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Job.find({ clientId: { $in: memberOids } })
        .sort({ createdAt: -1 }).limit(8)
        .populate("providerId", "name avatar")
        .lean(),
      Job.aggregate([
        { $match: { clientId: { $in: memberOids }, status: { $in: ["completed", "in_progress", "assigned"] }, providerId: { $ne: null } } },
        {
          $lookup: { from: "users", localField: "providerId", foreignField: "_id", as: "provider" },
        },
        {
          $lookup: { from: "reviews", let: { jid: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$jobId", "$$jid"] } } }], as: "review" },
        },
        { $unwind: { path: "$provider", preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: "$providerId",
            name:          { $first: "$provider.name" },
            avatar:        { $first: "$provider.avatar" },
            totalJobs:     { $sum: 1 },
            completedJobs: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            avgRating: {
              $avg: { $cond: [{ $gt: [{ $size: "$review" }, 0] }, { $arrayElemAt: ["$review.rating", 0] }, null] },
            },
          },
        },
        { $sort: { totalJobs: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const monthlySpend = (monthSpend[0]?.total ?? 0) as number;
    const budgetUsedPct = loc.monthlyBudget > 0 ? Math.min(100, Math.round((monthlySpend / loc.monthlyBudget) * 100)) : 0;

    // Average performance score from reviews on org jobs
    const reviewRows: { avgRating: number }[] = await mongoose.model("Review").aggregate([
      { $match: { revieweeId: { $in: memberOids } } },
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const avgRating = Math.round((reviewRows[0]?.avgRating ?? 0) * 10) / 10;

    return {
      location: loc,
      kpi: {
        budgetUsedPct,
        monthlySpend,
        activeJobs:    (jobStats[0]?.active ?? 0) as number,
        completedJobs: (jobStats[0]?.completed ?? 0) as number,
        avgRating,
      },
      recentJobs: (recentJobs as unknown[]).map((j: unknown) => {
        const job = j as { _id: { toString(): string }; title?: string; category?: string; status?: string; createdAt?: Date; providerId?: { name?: string; avatar?: string } | null };
        return {
          id: job._id.toString(),
          title: job.title ?? "Untitled",
          category: job.category ?? "Other",
          status: job.status ?? "open",
          createdAt: job.createdAt ?? new Date(),
          providerName: (job.providerId as { name?: string } | null)?.name ?? null,
          providerAvatar: (job.providerId as { avatar?: string } | null)?.avatar ?? null,
        };
      }),
      topProviders: (providerRows as { _id: string; name: string; avatar: string | null; totalJobs: number; completedJobs: number; avgRating: number }[]).map((r) => ({
        id: r._id.toString(),
        name: r.name,
        avatar: r.avatar ?? null,
        totalJobs: r.totalJobs,
        completedJobs: r.completedJobs,
        avgRating: Math.round((r.avgRating ?? 0) * 10) / 10,
      })),
    };
  }

  // ─── Executive Dashboard Snapshot ────────────────────────────────────────

  async getDashboardSnapshot(orgId: string, requestingUserId: string) {
    await this.requireMemberAccess(orgId, requestingUserId);

    const org = await businessOrganizationRepository.findById(orgId) as unknown as IBusinessOrganization | null;
    if (!org) throw new NotFoundError("Organization not found.");

    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    if (memberUserIds.length === 0) {
      return this._emptySnapshot(org);
    }

    await connectDB();
    const Job        = mongoose.model("Job");
    const Transaction= mongoose.model("Transaction");
    const Dispute    = mongoose.model("Dispute");

    const memberOids = memberUserIds.map((id) => new mongoose.Types.ObjectId(id));

    // ── Month boundaries ──────────────────────────────────────────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const since6     = new Date(now.getFullYear(), now.getMonth() - 5, 1); // 6 months

    // ── Parallel aggregations ─────────────────────────────────────────────
    const [
      jobStats,
      openDisputes,
      monthSpendRows,
      escrowRows,
      trendRows,
      providerRows,
    ] = await Promise.all([
      // 1. Job KPI counts
      Job.aggregate([
        { $match: { clientId: { $in: memberOids } } },
        {
          $group: {
            _id: null,
            active:     { $sum: { $cond: [{ $in: ["$status", ["open", "assigned", "in_progress"]] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          },
        },
      ]),

      // 2. Open disputes
      Dispute.countDocuments({ clientId: { $in: memberOids }, status: { $in: ["open", "under_review"] } }),

      // 3. Current-month spend
      Transaction.aggregate([
        { $match: { payerId: { $in: memberOids }, status: "completed", createdAt: { $gte: monthStart } } },
        {
          $lookup: { from: "jobs", localField: "jobId", foreignField: "_id", as: "job" },
        },
        { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: "$amount" },
            categories: { $push: { k: { $ifNull: ["$job.category", "Other"] }, v: "$amount" } },
          },
        },
      ]),

      // 4. Escrow (in-flight transactions)
      Transaction.aggregate([
        { $match: { payerId: { $in: memberOids }, status: { $in: ["escrow", "escrowed", "pending"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // 5. 6-month spend trend
      Transaction.aggregate([
        { $match: { payerId: { $in: memberOids }, status: "completed", createdAt: { $gte: since6 } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            spend: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 6. Top 5 providers by completed jobs
      Job.aggregate([
        {
          $match: {
            clientId: { $in: memberOids },
            status: { $in: ["completed", "in_progress", "assigned"] },
            providerId: { $ne: null },
          },
        },
        {
          $lookup: { from: "transactions", let: { jid: "$_id" }, pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$jobId", "$$jid"] }, { $eq: ["$status", "completed"] }] } } },
          ], as: "txn" },
        },
        {
          $lookup: { from: "users", localField: "providerId", foreignField: "_id", as: "provider" },
        },
        { $unwind: { path: "$provider", preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: "$providerId",
            providerName:   { $first: "$provider.name" },
            providerAvatar: { $first: "$provider.avatar" },
            totalJobs:  { $sum: 1 },
            completedJobs: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            totalSpend: { $sum: { $cond: [{ $gt: [{ $size: "$txn" }, 0] }, { $arrayElemAt: ["$txn.amount", 0] }, 0] } },
          },
        },
        { $sort: { totalJobs: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // ── Post-process ──────────────────────────────────────────────────────
    const totalBudget = org.locations.reduce((s, l) => s + l.monthlyBudget, 0);
    const monthSpend = (monthSpendRows[0]?.totalSpend ?? 0) as number;
    const escrowBalance = (escrowRows[0]?.total ?? 0) as number;

    // Category breakdown this month
    const catEntries = (monthSpendRows[0]?.categories ?? []) as { k: string; v: number }[];
    const categoryBreakdown: Record<string, number> = {};
    for (const { k, v } of catEntries) {
      categoryBreakdown[k] = (categoryBreakdown[k] ?? 0) + v;
    }

    // Spend trend (fill missing months with 0)
    const trendMap: Record<string, number> = {};
    for (const r of trendRows as { _id: string; spend: number }[]) trendMap[r._id] = r.spend;
    const spendTrend: { month: string; spend: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      spendTrend.push({ month: key, spend: trendMap[key] ?? 0 });
    }

    // Branch budget comparison
    const branchBudget = org.locations
      .filter((l) => l.isActive)
      .slice(0, 8)
      .map((l) => ({ label: l.label, budget: l.monthlyBudget }));

    return {
      kpi: {
        activeJobs:     (jobStats[0]?.active ?? 0) as number,
        inProgress:     (jobStats[0]?.inProgress ?? 0) as number,
        disputesOpen:   openDisputes as number,
        monthlySpend:   monthSpend,
        totalBudget,
        budgetRemaining: Math.max(0, totalBudget - monthSpend),
        escrowBalance,
      },
      spendTrend,
      categoryBreakdown,
      topProviders: (providerRows as { _id: string; providerName: string; providerAvatar: string | null; totalJobs: number; completedJobs: number; totalSpend: number }[]).map((r) => ({
        id: r._id.toString(),
        name: r.providerName,
        avatar: r.providerAvatar ?? null,
        totalJobs: r.totalJobs,
        completedJobs: r.completedJobs,
        totalSpend: r.totalSpend,
      })),
      branchBudget,
    };
  }

  // ─── Escrow & Payments ────────────────────────────────────────────────────

  async getEscrowData(
    orgId: string,
    requestingUserId: string,
    page = 1,
    limit = 20,
  ) {
    await this.requireMemberAccess(orgId, requestingUserId);
    await connectDB();
    const org = await businessOrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization not found");

    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    const memberOids = memberUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const Transaction = mongoose.model("Transaction");
    const Payment     = mongoose.model("Payment");
    const Job         = mongoose.model("Job");
    const User        = mongoose.model("User");

    // Escrow balance — sum of in-flight transactions
    const [escrowAgg] = await Transaction.aggregate([
      { $match: { payerId: { $in: memberOids }, status: { $in: ["escrow", "escrowed", "pending"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const escrowBalance: number = escrowAgg?.total ?? 0;

    // Pending releases — funded jobs awaiting escrow release
    const pendingJobs = await Job.find({
      clientId: { $in: memberOids },
      escrowStatus: "funded",
      status: { $in: ["in_progress", "completed", "assigned"] },
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate("providerId", "name avatar")
      .lean();

    const pendingReleases = pendingJobs.map((j: Record<string, unknown>) => ({
      jobId:        (j._id as mongoose.Types.ObjectId).toString(),
      title:        j.title as string,
      amount:       j.budget as number,
      status:       j.status as string,
      escrowStatus: j.escrowStatus as string,
      scheduleDate: j.scheduleDate as Date,
      provider:     j.providerId
        ? { id: ((j.providerId as Record<string, unknown>)._id as mongoose.Types.ObjectId).toString(), name: (j.providerId as Record<string, unknown>).name as string, avatar: (j.providerId as Record<string, unknown>).avatar as string | null }
        : null,
      milestones:   (j.milestones as unknown[]) ?? [],
    }));

    // Payment history — completed payments
    const skip = (page - 1) * limit;
    const [historyRows, historyTotal] = await Promise.all([
      Payment.find({ clientId: { $in: memberOids }, status: "paid" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("jobId", "title category")
        .populate("providerId", "name")
        .lean(),
      Payment.countDocuments({ clientId: { $in: memberOids }, status: "paid" }),
    ]);

    const paymentHistory = historyRows.map((p: Record<string, unknown>) => ({
      paymentId:   (p._id as mongoose.Types.ObjectId).toString(),
      amount:      p.amount as number,
      status:      p.status as string,
      method:      (p.paymentMethodType as string | undefined) ?? "card",
      createdAt:   p.createdAt as Date,
      job: p.jobId
        ? { id: ((p.jobId as Record<string, unknown>)._id as mongoose.Types.ObjectId).toString(), title: (p.jobId as Record<string, unknown>).title as string, category: (p.jobId as Record<string, unknown>).category as string }
        : null,
      provider: p.providerId
        ? { id: ((p.providerId as Record<string, unknown>)._id as mongoose.Types.ObjectId).toString(), name: (p.providerId as Record<string, unknown>).name as string }
        : null,
    }));

    return {
      escrowBalance,
      pendingReleases,
      paymentHistory,
      historyTotal,
      historyPage:  page,
      historyLimit: limit,
    };
  }

  // ─── Dispute Resolution ────────────────────────────────────────────────────

  async getDisputesData(
    orgId: string,
    requestingUserId: string,
    page = 1,
    limit = 20,
    statusFilter?: string,
  ) {
    await this.requireMemberAccess(orgId, requestingUserId);
    await connectDB();
    const org = await businessOrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization not found");

    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    const memberOids = memberUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const Dispute = mongoose.model("Dispute");
    const Job     = mongoose.model("Job");

    // Get all member job IDs first
    const memberJobIds = await Job.find({ clientId: { $in: memberOids } }).distinct("_id");

    const statusMatch: Record<string, unknown> = statusFilter && statusFilter !== "all"
      ? { status: statusFilter }
      : { status: { $in: ["open", "under_review", "resolved", "closed"] } };

    const filter = { jobId: { $in: memberJobIds }, ...statusMatch };
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Dispute.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("jobId", "title category budget escrowStatus providerId clientId")
        .populate("raisedBy", "name avatar role")
        .lean(),
      Dispute.countDocuments(filter),
    ]);

    // Enrich with provider name from job
    const disputes = await Promise.all(rows.map(async (d: Record<string, unknown>) => {
      const job = d.jobId as Record<string, unknown> | null;
      let providerName: string | null = null;
      let providerAvatar: string | null = null;
      if (job?.providerId) {
        const User = mongoose.model("User");
        const prov = await User.findById(job.providerId).select("name avatar").lean() as Record<string, unknown> | null;
        providerName   = prov?.name as string ?? null;
        providerAvatar = prov?.avatar as string ?? null;
      }
      // Find which branch (location) the job's client belongs to
      // (requires explicit branch-job linking — stub as null for now)
      const branchLabel: string | null = null;
      void org; // org used for ownerId check via requireMemberAccess
      return {
        disputeId:      (d._id as mongoose.Types.ObjectId).toString(),
        status:         d.status as string,
        reason:         d.reason as string,
        evidence:       (d.evidence as string[]) ?? [],
        resolutionNotes: d.resolutionNotes as string | null,
        createdAt:      d.createdAt as Date,
        updatedAt:      d.updatedAt as Date,
        job: job ? {
          id:          ((job._id as mongoose.Types.ObjectId)).toString(),
          title:       job.title as string,
          category:    job.category as string,
          budget:      job.budget as number,
          escrowStatus: job.escrowStatus as string,
        } : null,
        raisedBy: d.raisedBy ? {
          id:     (((d.raisedBy as Record<string, unknown>)._id) as mongoose.Types.ObjectId).toString(),
          name:   (d.raisedBy as Record<string, unknown>).name as string,
          avatar: (d.raisedBy as Record<string, unknown>).avatar as string | null,
          role:   (d.raisedBy as Record<string, unknown>).role as string,
        } : null,
        provider:  providerName ? { name: providerName, avatar: providerAvatar } : null,
        branchLabel,
      };
    }));

    const openCount       = await Dispute.countDocuments({ jobId: { $in: memberJobIds }, status: { $in: ["open", "under_review"] } });
    const resolvedCount   = await Dispute.countDocuments({ jobId: { $in: memberJobIds }, status: { $in: ["resolved", "closed"] } });

    return { disputes, total, page, limit, openCount, resolvedCount };
  }

  async getBillingData(orgId: string, requestingUserId: string) {
    await this.requireMemberAccess(orgId, requestingUserId);
    await connectDB();
    const org = await businessOrganizationRepository.findById(orgId);
    if (!org) throw new NotFoundError("Organization not found");

    const memberUserIds = await businessMemberRepository.getMemberUserIds(orgId);
    const memberOids = memberUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const Transaction = mongoose.model("Transaction");

    // ── Commission history – last 12 calendar months ──────────────────────────
    const now    = new Date();
    const from12 = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const commAgg: { _id: string; gross: number; commission: number; count: number }[] =
      await Transaction.aggregate([
        {
          $match: {
            payerId: { $in: memberOids },
            status:  { $in: ["completed", "released", "settled", "paid"] },
            createdAt: { $gte: from12 },
          },
        },
        {
          $group: {
            _id:        { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            gross:      { $sum: "$amount" },
            commission: { $sum: "$commission" },
            count:      { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

    const commissionHistory = commAgg.map((row) => ({
      month:      row._id,
      gross:      row.gross,
      commission: parseFloat((row.commission ?? 0).toFixed(2)),
      jobs:       row.count,
    }));

    // ── All-time totals ────────────────────────────────────────────────────────
    const [allTimeAgg] = await Transaction.aggregate([
      {
        $match: {
          payerId: { $in: memberOids },
          status:  { $in: ["completed", "released", "settled", "paid"] },
        },
      },
      { $group: { _id: null, gross: { $sum: "$amount" }, commission: { $sum: "$commission" }, count: { $sum: 1 } } },
    ]);

    const totalGrossSpend     = allTimeAgg?.gross ?? 0;
    const totalCommissionPaid = parseFloat(((allTimeAgg?.commission ?? 0) as number).toFixed(2));
    const totalJobsCompleted  = allTimeAgg?.count ?? 0;

    // ── This-month summary ─────────────────────────────────────────────────────
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth    = commissionHistory.find((r) => r.month === thisMonthKey);
    const thisMonthGross      = thisMonth?.gross      ?? 0;
    const thisMonthCommission = thisMonth?.commission ?? 0;

    // ── Branch & member counts ────────────────────────────────────────────────
    const branchCount = org.locations.filter((l) => l.isActive).length;
    const memberCount = memberUserIds.length;

    return {
      commissionRate:       getBusinessCommissionRate((org.plan ?? "starter") as import("@/types").BusinessPlan),
      commissionHistory,
      totalGrossSpend,
      totalCommissionPaid,
      totalJobsCompleted,
      thisMonthGross,
      thisMonthCommission,
      branchCount,
      memberCount,
      orgName:              org.name,
      // ── Subscription fields from DB ──────────────────────────────────────
      plan:             (org.plan ?? "starter") as string,
      planStatus:       (org.planStatus ?? "active") as string,
      planActivatedAt:  org.planActivatedAt ?? null,
      planExpiresAt:    org.planExpiresAt   ?? null,
      pendingPlan:      org.pendingPlan     ?? null,
    };
  }

  private _emptySnapshot(org: IBusinessOrganization) {
    const totalBudget = org.locations.reduce((s, l) => s + l.monthlyBudget, 0);
    return {
      kpi: { activeJobs: 0, inProgress: 0, disputesOpen: 0, monthlySpend: 0, totalBudget, budgetRemaining: totalBudget, escrowBalance: 0 },
      spendTrend: [] as { month: string; spend: number }[],
      categoryBreakdown: {} as Record<string, number>,
      topProviders: [] as { id: string; name: string; avatar: string | null; totalJobs: number; completedJobs: number; totalSpend: number }[],
      branchBudget: org.locations.filter((l) => l.isActive).slice(0, 8).map((l) => ({ label: l.label, budget: l.monthlyBudget })),
    };
  }
}

export const businessService = new BusinessService();
