/**
 * OpenAI integration for smart job matching and provider recommendations.
 *
 * Required env var: OPENAI_API_KEY
 *
 * Uses GPT-4o-mini to rank marketplace jobs by relevance to a provider's
 * skills and profile, and to recommend providers to clients.
 * Falls back gracefully if OpenAI is unavailable or not configured.
 */

import OpenAI from "openai";
import type { IJob, IProviderProfile } from "@/types";

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export interface RankedJob {
  job: IJob;
  relevanceScore: number; // 0–100
  reason: string;
}

/**
 * Rank an array of open jobs by relevance to a provider.
 * Returns the same jobs in order of decreasing relevance.
 * If OpenAI is unavailable the original order is preserved with a score of 50.
 */
export async function rankJobsForProvider(
  jobs: IJob[],
  profile: Pick<IProviderProfile, "bio" | "skills" | "yearsExperience"> | null
): Promise<RankedJob[]> {
  if (jobs.length === 0) return [];

  const client = getClient();

  // Graceful fallback — no API key or too few jobs to bother ranking
  if (!client || !profile || jobs.length <= 1) {
    return jobs.map((j) => ({ job: j, relevanceScore: 50, reason: "" }));
  }

  const jobSummaries = jobs.map((j, i) => ({
    index: i,
    title: j.title,
    category: j.category,
    description: j.description.slice(0, 300),
    budget: j.budget,
    location: j.location,
  }));

  const systemPrompt = `You are a job-matching assistant for a Philippine local services marketplace.
Given a service provider's profile and a list of job postings, rank the jobs by how well they match
the provider's skills and experience. Return ONLY a JSON array with this shape:
[{"index": <original_index>, "score": <0-100>, "reason": "<one short sentence>"}]
No other text.`;

  const userPrompt = `Provider profile:
- Skills: ${profile.skills.join(", ") || "not specified"}
- Years of experience: ${profile.yearsExperience}
- Bio: ${profile.bio.slice(0, 200)}

Jobs (${jobs.length} total):
${JSON.stringify(jobSummaries, null, 2)}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "[]";

    // GPT sometimes wraps it in an object
    let parsed: { index: number; score: number; reason: string }[];
    const obj = JSON.parse(raw);
    parsed = Array.isArray(obj) ? obj : (obj.rankings ?? obj.jobs ?? obj.results ?? []);

    // Build a lookup map and sort
    const scoreMap = new Map<number, { score: number; reason: string }>();
    for (const item of parsed) {
      if (typeof item.index === "number") {
        scoreMap.set(item.index, { score: item.score ?? 50, reason: item.reason ?? "" });
      }
    }

    const ranked: RankedJob[] = jobs.map((job, i) => {
      const s = scoreMap.get(i) ?? { score: 50, reason: "" };
      return { job, relevanceScore: s.score, reason: s.reason };
    });

    ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return ranked;
  } catch (err) {
    console.error("[OpenAI] rankJobsForProvider failed:", err);
    return jobs.map((j) => ({ job: j, relevanceScore: 50, reason: "" }));
  }
}

// ─── Provider recommendations for clients ─────────────────────────────────────

export interface RecommendedProvider {
  providerId: string;
  score: number; // 0–100
  reason: string;
}

export interface ProviderCandidate {
  id: string;
  name: string;
  skills: string[];
  bio: string;
  avgRating: number;
  completedJobCount: number;
  hourlyRate?: number;
}

export interface ClientHistoryItem {
  category: string;
  budget: number;
}

/**
 * Rank a list of provider candidates by fit for a client's job.
 * Returns top results sorted by score descending.
 * Falls back to rating-sorted order if OpenAI is unavailable.
 */
export async function recommendProvidersForClient(params: {
  category: string;
  budget: number;
  clientHistory: ClientHistoryItem[];
  providers: ProviderCandidate[];
}): Promise<RecommendedProvider[]> {
  const { category, budget, clientHistory, providers } = params;
  if (providers.length === 0) return [];

  // Fallback: sort by rating
  const fallback = (): RecommendedProvider[] =>
    [...providers]
      .sort((a, b) => b.avgRating - a.avgRating || b.completedJobCount - a.completedJobCount)
      .slice(0, 3)
      .map((p) => ({ providerId: p.id, score: 50, reason: "" }));

  const client = getClient();
  if (!client) return fallback();

  const summaries = providers.slice(0, 15).map((p, i) => ({
    index: i,
    name: p.name,
    skills: p.skills.slice(0, 8).join(", "),
    bio: p.bio.slice(0, 150),
    rating: p.avgRating,
    jobs: p.completedJobCount,
    rate: p.hourlyRate ?? null,
  }));

  const historyText =
    clientHistory.length > 0
      ? clientHistory
          .slice(0, 10)
          .map((h) => `${h.category} (₱${h.budget})`)
          .join(", ")
      : "No prior bookings";

  const systemPrompt = `You are a provider-matching assistant for a Philippine local services marketplace.
Given a client's job category, budget, booking history, and a list of provider candidates, recommend the best 3 providers.
Return ONLY a JSON array: [{"index": <0-based>, "score": <0-100>, "reason": "<one short sentence why>"}]
No other text.`;

  const userPrompt = `Job category: ${category}
Budget: ₱${budget}
Client booking history: ${historyText}

Providers:
${JSON.stringify(summaries, null, 2)}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 512,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "[]";
    const obj = JSON.parse(raw);
    const parsed: { index: number; score: number; reason: string }[] = Array.isArray(obj)
      ? obj
      : (obj.recommendations ?? obj.providers ?? obj.results ?? []);

    const scoreMap = new Map<number, { score: number; reason: string }>();
    for (const item of parsed) {
      if (typeof item.index === "number") {
        scoreMap.set(item.index, { score: item.score ?? 50, reason: item.reason ?? "" });
      }
    }

    return providers
      .map((p, i) => {
        const s = scoreMap.get(i) ?? { score: 0, reason: "" };
        return { providerId: p.id, score: s.score, reason: s.reason };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  } catch (err) {
    console.error("[OpenAI] recommendProvidersForClient failed:", err);
    return fallback();
  }
}
