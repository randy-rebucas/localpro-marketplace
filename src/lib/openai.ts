/**
 * OpenAI integration for smart job matching.
 *
 * Required env var: OPENAI_API_KEY
 *
 * Uses GPT-4o-mini to rank marketplace jobs by relevance to a provider's
 * skills and profile. Falls back to chronological order if OpenAI is
 * unavailable or not configured.
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
