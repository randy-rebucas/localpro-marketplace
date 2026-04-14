/**
 * Chat Dispatcher Action Handlers
 * Handles job creation, provider search, and assignment logic
 */

import OpenAI from "openai";
import { jobRepository, providerProfileRepository, userRepository } from "@/repositories";
import { connectDB } from "@/lib/db";
import { providerMatcherService } from "@/services/provider-matcher.service";
import type { IJob, IProviderProfile, IUser } from "@/types";

export interface JobCreationData {
  title: string;
  description: string;
  budget: number;
  category: string;
  location: string;
  urgency?: "standard" | "same_day" | "rush";
  scheduleDate?: string;
}

export interface ProviderMatch {
  providerId: string;
  profile: Partial<IProviderProfile>;
  user: Partial<IUser>;
  matchScore: number;
  reason: string;
}

/**
 * Validate job creation data extracted from chat
 */
export function validateJobData(data: any): JobCreationData | null {
  if (!data.jobTitle || typeof data.jobTitle !== "string" || data.jobTitle.trim().length < 5) {
    return null;
  }
  if (!data.description || typeof data.description !== "string" || data.description.length < 20) {
    return null;
  }
  if (!data.budget || typeof data.budget !== "number" || data.budget <= 0) {
    return null;
  }
  if (!data.category || typeof data.category !== "string") {
    return null;
  }
  if (!data.location || typeof data.location !== "string") {
    return null;
  }

  return {
    title: data.jobTitle.trim().slice(0, 200),
    description: data.description.trim().slice(0, 2000),
    budget: Math.round(data.budget),
    category: data.category.trim(),
    location: data.location.trim(),
    urgency: data.urgency || "standard",
    scheduleDate: data.scheduleDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Search for providers matching job criteria
 */
export async function searchProvidersForJob(
  jobData: JobCreationData,
  maxResults: number = 5
): Promise<ProviderMatch[]> {
  try {
    await connectDB();

    // Use real provider matching with quality scoring
    const matches = await providerMatcherService.findProvidersForJob(
      {
        category: jobData.category,
        location: jobData.location,
        urgency: jobData.urgency,
      },
      maxResults
    );

    // Convert to ProviderMatch interface (mapper for legacy compatibility)
    return matches.map((match) => ({
      providerId: match.providerId,
      profile: match.profile,
      user: match.user,
      matchScore: match.matchScore,
      reason: match.reason,
    }));
  } catch (err) {
    console.error("[searchProvidersForJob] error:", err);
    return [];
  }
}

/**
 * Format extracted data into structured job creation payload
 */
export function formatJobPayload(extracted: any): Partial<IJob> {
  const scheduleDate = extracted.scheduleDate
    ? new Date(extracted.scheduleDate)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  return {
    title: extracted.jobTitle,
    description: extracted.description,
    category: extracted.category,
    budget: extracted.budget,
    location: extracted.location,
    scheduleDate: scheduleDate,
    urgency: extracted.urgency || "standard",
  };
}

/**
 * Parse provider match into booking confirmation data
 */
export function formatBookingConfirmation(
  match: ProviderMatch,
  jobData: JobCreationData
) {
  return {
    jobTitle: jobData.title,
    jobBudget: `₱${jobData.budget.toLocaleString()}`,
    jobCategory: jobData.category,
    jobLocation: jobData.location,
    providerName: match.user.name,
    providerRating: (match.profile.avgRating || 0).toFixed(1),
    providerJobs: match.profile.completedJobCount || 0,
    matchScore: match.matchScore,
    reason: match.reason,
  };
}

/**
 * Clarifying questions when data is incomplete
 */
export function generateClarifyingQuestions(extracted: any): string[] {
  const questions: string[] = [];

  if (!extracted.jobTitle) {
    questions.push("What type of service do you need? (e.g., plumbing, electrical, cleaning)");
  }
  if (!extracted.description) {
    questions.push("Can you describe what work needs to be done in more detail?");
  }
  if (!extracted.budget) {
    questions.push("What's your budget for this job? (in Philippine Pesos)");
  }
  if (!extracted.location) {
    questions.push("Where is the job located?");
  }

  return questions.length ? questions : [];
}
