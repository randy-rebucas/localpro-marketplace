import { pesoRepository } from "@/repositories/peso.repository";
import { userRepository } from "@/repositories/user.repository";
import { jobRepository } from "@/repositories/job.repository";
import { providerProfileRepository } from "@/repositories/providerProfile.repository";
import { sendEmail } from "@/lib/email";
import { ConflictError, ForbiddenError, NotFoundError, UnprocessableError, ValidationError } from "@/lib/errors";
import type { WorkforceRegistryFilters } from "@/repositories/peso.repository";
import type { PesoVerificationTag, JobTag, IPesoCertification } from "@/types";
import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface PostPesoJobDto {
  category: string;
  title: string;
  description: string;
  budget: number;
  location: string;
  scheduleDate: string | Date;
  specialInstructions?: string;
  jobTags?: JobTag[];
  isPriority?: boolean;
}

export interface ReferProviderDto {
  name: string;
  email: string;
  phone?: string;
  barangay?: string;
  skills?: string[];
  livelihoodProgram?: string;
}

export interface BulkOnboardRow {
  name: string;
  email: string;
  phone?: string;
  skills?: string;
  barangay?: string;
}

export class PesoService {
  async getDashboardStats(officerId: string) {
    const office = await pesoRepository.findOfficeByOfficerId(officerId);
    if (!office) throw new NotFoundError("PESO office");

    // Collect all officer IDs (head + staff) — same logic as getReports
    const rawHead = office.headOfficerId as unknown as Record<string, unknown> | string | null;
    const headId  = rawHead && typeof rawHead === "object" ? String(rawHead._id) : String(rawHead ?? "");
    const staffIds = ((office.officerIds ?? []) as unknown[]).map((o) => {
      if (o && typeof o === "object") return String((o as Record<string, unknown>)._id ?? o);
      return String(o);
    });
    const officerIds = [...new Set([headId, ...staffIds].filter(Boolean))];

    const data = await pesoRepository.getOfficeReportStats(officerIds);

    return {
      ...data.stats,
      topSkills:    data.topSkills,
      topCategories: data.topCategories,
      officeName:   office.officeName,
      municipality: office.municipality,
      region:       office.region,
    };
  }

  async getWorkforceRegistry(filters: WorkforceRegistryFilters) {
    return pesoRepository.getProviderRegistry(filters);
  }

  async postJob(officerId: string, dto: PostPesoJobDto) {
    const job = await jobRepository.create({
      clientId: officerId,
      category: dto.category,
      title: dto.title,
      description: dto.description,
      budget: dto.budget,
      location: dto.location,
      scheduleDate: new Date(dto.scheduleDate),
      specialInstructions: dto.specialInstructions ?? "",
      status: "open",
      escrowStatus: "not_funded",
      riskScore: 0,
      jobSource: "peso",
      jobTags: dto.jobTags ?? ["peso"],
      isPriority: dto.isPriority ?? false,
      pesoPostedBy: officerId,
    });
    return job;
  }

  async listPesoJobs(page = 1, limit = 20) {
    return jobRepository.findPaginated(
      { jobSource: { $in: ["peso", "lgu"] } },
      { page, limit }
    );
  }

  async referProvider(officerId: string, dto: ReferProviderDto) {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictError("A user with this email already exists");

    // Generate a temporary password; they reset via the activation link
    const tempPassword = crypto.randomBytes(10).toString("hex");

    const user = await userRepository.create({
      name: dto.name,
      email: dto.email,
      password: tempPassword,
      role: "provider",
      isVerified: false,
      isSuspended: false,
      approvalStatus: "pending_approval",
      phone: dto.phone ?? null,
    } as Record<string, unknown>);

    const userId = String(user._id);

    // Create provider profile with PESO referral fields
    await providerProfileRepository.create({
      userId,
      bio: "",
      skills: dto.skills ?? [],
      yearsExperience: 0,
      portfolioItems: [],
      serviceAreas: [],
      barangay: dto.barangay ?? null,
      pesoReferredBy: officerId,
      livelihoodProgram: dto.livelihoodProgram ?? null,
      pesoVerificationTags: ["peso_registered"],
    } as Record<string, unknown>);

    // Send activation / password-reset link
    const resetToken = crypto.randomBytes(32).toString("hex");
    const userDoc = await userRepository.getDocByIdWithPassword(userId);
    if (userDoc) {
      (userDoc as unknown as Record<string, unknown>).resetPasswordToken = resetToken;
      (userDoc as unknown as Record<string, unknown>).resetPasswordTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await userDoc.save();
    }

    const activationUrl = `${APP_URL}/reset-password?token=${resetToken}`;
    await sendEmail(
      dto.email,
      "You've been referred to LocalPro by PESO",
      `<p>Hi ${dto.name},</p>
       <p>PESO has created a LocalPro provider account for you. Click the link below to set your password and start receiving jobs:</p>
       <p><a href="${activationUrl}" style="color:#1e40af;font-weight:bold;">Activate Account</a></p>
       <p>This link expires in 7 days.</p>
       <p>— The LocalPro Team</p>`
    );

    return { userId, email: dto.email };
  }

  async bulkOnboard(officerId: string, rows: BulkOnboardRow[]) {
    const results: Array<{ email: string; status: "created" | "skipped"; reason?: string }> = [];

    for (const row of rows) {
      if (!row.name || !row.email) {
        results.push({ email: row.email ?? "", status: "skipped", reason: "Missing name or email" });
        continue;
      }

      const existing = await userRepository.findByEmail(row.email.toLowerCase().trim());
      if (existing) {
        results.push({ email: row.email, status: "skipped", reason: "Email already registered" });
        continue;
      }

      try {
        const skills = row.skills
          ? row.skills.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        const tempPassword = crypto.randomBytes(10).toString("hex");
        const user = await userRepository.create({
          name: row.name.trim(),
          email: row.email.toLowerCase().trim(),
          password: tempPassword,
          role: "provider",
          isVerified: false,
          isSuspended: false,
          approvalStatus: "pending_approval",
          phone: row.phone ?? null,
        } as Record<string, unknown>);

        const userId = String(user._id);

        await providerProfileRepository.create({
          userId,
          bio: "",
          skills,
          yearsExperience: 0,
          portfolioItems: [],
          serviceAreas: [],
          barangay: row.barangay ?? null,
          pesoReferredBy: officerId,
          pesoVerificationTags: ["peso_registered"],
        } as Record<string, unknown>);

        const resetToken = crypto.randomBytes(32).toString("hex");
        const userDoc = await userRepository.getDocByIdWithPassword(userId);
        if (userDoc) {
          (userDoc as unknown as Record<string, unknown>).resetPasswordToken = resetToken;
          (userDoc as unknown as Record<string, unknown>).resetPasswordTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await userDoc.save();
        }

        const activationUrl = `${APP_URL}/reset-password?token=${resetToken}`;
        await sendEmail(
          row.email,
          "Welcome to LocalPro — Activate Your Account",
          `<p>Hi ${row.name},</p>
           <p>PESO has registered you on LocalPro. Set your password to start receiving jobs:</p>
           <p><a href="${activationUrl}" style="color:#1e40af;font-weight:bold;">Activate Account</a></p>
           <p>This link expires in 7 days.</p>
           <p>— The LocalPro Team</p>`
        );

        results.push({ email: row.email, status: "created" });
      } catch {
        results.push({ email: row.email, status: "skipped", reason: "Internal error" });
      }
    }

    return results;
  }

  async verifyProvider(officerId: string, providerId: string, tags: PesoVerificationTag[]) {
    const profile = await providerProfileRepository.findOne({ userId: providerId });
    if (!profile) throw new NotFoundError("Provider profile");

    const validTags: PesoVerificationTag[] = ["peso_registered", "lgu_resident", "peso_recommended"];
    const invalidTag = tags.find((t) => !validTags.includes(t));
    if (invalidTag) throw new UnprocessableError(`Invalid verification tag: ${invalidTag}`);

    const updated = await providerProfileRepository.updateById(
      String(profile._id),
      { $set: { pesoVerificationTags: tags } }
    );
    return updated;
  }

  async getMyOffice(officerId: string) {
    const office = await pesoRepository.findOfficeByOfficerId(officerId);
    if (!office) throw new NotFoundError("PESO office");
    return office;
  }

  async addOfficer(headOfficerId: string, dto: { name: string; email: string; phone?: string }) {
    // Verify requestor is the head officer of an existing office
    const office = await pesoRepository.findOfficeByHeadOfficer(headOfficerId);
    if (!office) throw new ForbiddenError();

    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictError("A user with this email already exists");

    const tempPassword = crypto.randomBytes(10).toString("hex");
    const newUser = await userRepository.create({
      name: dto.name,
      email: dto.email,
      password: tempPassword,
      role: "peso",
      isVerified: false,
      isSuspended: false,
      approvalStatus: "approved",
      phone: dto.phone ?? null,
    } as Record<string, unknown>);

    const userId = String(newUser._id);

    // Add to the office's officer list
    await pesoRepository.addOfficerToOffice(String(office._id), userId);

    // Send activation link
    const resetToken = crypto.randomBytes(32).toString("hex");
    const userDoc = await userRepository.getDocByIdWithPassword(userId);
    if (userDoc) {
      (userDoc as unknown as Record<string, unknown>).resetPasswordToken = resetToken;
      (userDoc as unknown as Record<string, unknown>).resetPasswordTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await userDoc.save();
    }

    const activationUrl = `${APP_URL}/reset-password?token=${resetToken}`;
    await sendEmail(
      dto.email,
      "You've been added as a PESO Officer on LocalPro",
      `<p>Hi ${dto.name},</p>
       <p>You have been added as a PESO officer to <strong>${(office as Record<string, unknown>).officeName as string}</strong> on LocalPro.</p>
       <p>Click the link below to set your password and access the PESO dashboard:</p>
       <p><a href="${activationUrl}" style="color:#1e40af;font-weight:bold;">Activate Account</a></p>
       <p>This link expires in 7 days.</p>
       <p>— The LocalPro Team</p>`
    );

    return { userId, email: dto.email };
  }

  async removeOfficer(headOfficerId: string, officerUserId: string) {
    const office = await pesoRepository.findOfficeByHeadOfficer(headOfficerId);
    if (!office) throw new ForbiddenError();

    if (String((office as Record<string, unknown>).headOfficerId) === officerUserId) {
      throw new UnprocessableError("Cannot remove the head officer from the office");
    }

    await pesoRepository.removeOfficerFromOffice(String(office._id), officerUserId);
    return { removed: officerUserId };
  }

  // ── Certifications ────────────────────────────────────────────────────────

  async addCertification(officerId: string, providerId: string, cert: Omit<IPesoCertification, "_id">) {
    const profile = await providerProfileRepository.findOne({ userId: providerId });
    if (!profile) throw new NotFoundError("Provider profile");

    const certEntry = { ...cert, _id: crypto.randomUUID(), verifiedByPeso: true };
    await providerProfileRepository.updateById(String(profile._id), {
      $push: { certifications: certEntry },
    } as Record<string, unknown>);

    return certEntry;
  }

  async removeCertification(officerId: string, providerId: string, certId: string) {
    const profile = await providerProfileRepository.findOne({ userId: providerId });
    if (!profile) throw new NotFoundError("Provider profile");

    await providerProfileRepository.updateById(String(profile._id), {
      $pull: { certifications: { _id: certId } },
    } as Record<string, unknown>);

    return { removed: certId };
  }

  // ── Emergency broadcast ───────────────────────────────────────────────────

  async sendEmergencyBroadcast(officerId: string, dto: {
    jobType: string;
    location: string;
    urgency: "low" | "medium" | "high" | "critical";
    workersNeeded: number;
    duration: string;
    notes?: string;
  }) {
    if (!dto.jobType || !dto.location) throw new ValidationError("Job type and location are required");

    const job = await jobRepository.create({
      clientId: officerId,
      category: dto.jobType,
      title: `[EMERGENCY] ${dto.jobType} – ${dto.location}`,
      description: `Urgency: ${dto.urgency.toUpperCase()}\nWorkers needed: ${dto.workersNeeded}\nDuration: ${dto.duration}${dto.notes ? `\n\nNotes: ${dto.notes}` : ""}`,
      budget: 0,
      location: dto.location,
      scheduleDate: new Date(),
      specialInstructions: dto.notes ?? "",
      status: "open",
      escrowStatus: "not_funded",
      riskScore: 0,
      jobSource: "peso",
      jobTags: ["emergency", "peso"],
      isPriority: true,
      pesoPostedBy: officerId,
    });

    return job;
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async getReports(officerId: string) {
    // Resolve the PESO office so we can scope data to all officers in this office
    const office = await pesoRepository.findOfficeByOfficerId(officerId);
    if (!office) throw new NotFoundError("PESO office");

    // Collect all officer IDs (head + staff)
    const rawHead = office.headOfficerId as unknown as Record<string, unknown> | string | null;
    const headId  = rawHead && typeof rawHead === "object" ? String(rawHead._id) : String(rawHead ?? "");
    const staffIds = ((office.officerIds ?? []) as unknown[]).map((o) => {
      if (o && typeof o === "object") return String((o as Record<string, unknown>)._id ?? o);
      return String(o);
    });
    const officerIds = [...new Set([headId, ...staffIds].filter(Boolean))];

    const data = await pesoRepository.getOfficeReportStats(officerIds);
    return {
      ...data,
      officeName:   office.officeName,
      municipality: office.municipality,
      region:       office.region,
    };
  }

  // ── Office settings ───────────────────────────────────────────────────────

  async getOfficeSettings(officerId: string) {
    const office = await pesoRepository.findOfficeByOfficerId(officerId);
    if (!office) throw new NotFoundError("PESO office");
    return office;
  }

  async updateOfficeSettings(officerId: string, data: {
    officeName?: string;
    officeType?: "city" | "municipal" | "provincial" | null;
    municipality?: string;
    province?: string | null;
    region?: string;
    zipCode?: string | null;
    contactEmail?: string;
    contactPhone?: string | null;
    contactMobile?: string | null;
    address?: string | null;
    website?: string | null;
    isActive?: boolean;
  }) {
    const office = await pesoRepository.findOfficeByHeadOfficer(officerId);
    if (!office) throw new ForbiddenError("Only the head officer can update office settings");

    const updated = await pesoRepository.updateOffice(String(office._id), data);
    if (!updated) throw new NotFoundError("PESO office");
    return updated;
  }

  async updateOfficeLogo(officerId: string, logoUrl: string) {
    const office = await pesoRepository.findOfficeByHeadOfficer(officerId);
    if (!office) throw new ForbiddenError("Only the head officer can update the office logo");

    // empty string means remove
    const updated = await pesoRepository.updateOffice(String(office._id), {
      logoUrl: logoUrl || null,
    });
    if (!updated) throw new NotFoundError("PESO office");
    return updated;
  }
}

export const pesoService = new PesoService();
