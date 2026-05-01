import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { getProviderTier } from "@/lib/tier";
import {
  buildTrainingRecommendations,
  type CatalogCourseInput,
  type ProviderPerformanceSnapshot,
  type TrainingRecommendationsResult,
} from "@/lib/training-recommendations";
import { providerProfileRepository } from "@/repositories";
import { trainingService } from "@/services/training.service";
import type { TrainingCourseCategory } from "@/types";

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Optional Gold+ polish: rewrite rationales and CPD line without changing titles or sources.
 * Deterministic payload must remain authoritative for links/course ids.
 */
async function polishWithLLM(base: TrainingRecommendationsResult): Promise<TrainingRecommendationsResult> {
  const client = getOpenAI();
  if (!client || base.items.length === 0) return base;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 1400,
      messages: [
        {
          role: "system",
          content: `You polish training recommendation copy for LocalPro providers in the Philippines.
Rules:
- Do NOT invent courses, certificates, or URLs.
- Keep the same number of items and order as input.
- Each rationale stays 1–3 sentences, professional, encouraging continuous improvement (TESDA/industry context OK).
- cpdMessage: one short paragraph encouraging ongoing professional development.
Output ONLY valid JSON: {"items":[{"rationale":"..."}],"cpdMessage":"..."}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            items: base.items.map((i) => ({ title: i.title, rationale: i.rationale })),
            cpdMessage: base.cpdMessage,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean) as {
      items?: Array<{ rationale?: string }>;
      cpdMessage?: string;
    };

    if (!Array.isArray(parsed.items) || parsed.items.length !== base.items.length) return base;

    const items = base.items.map((item, i) => ({
      ...item,
      rationale: typeof parsed.items![i]?.rationale === "string" ? parsed.items![i].rationale! : item.rationale,
    }));

    const cpdMessage =
      typeof parsed.cpdMessage === "string" && parsed.cpdMessage.trim()
        ? parsed.cpdMessage.trim()
        : base.cpdMessage;

    return { ...base, items, cpdMessage };
  } catch {
    return base;
  }
}

/** GET /api/provider/training/recommendations — personalized LocalPro + TESDA/industry suggestions */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "provider");

  const rl = await checkRateLimit(`provider:training:rec:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const profile = await providerProfileRepository.findByUserId(user.userId);

  const tier = getProviderTier(
    profile?.completedJobCount ?? 0,
    profile?.avgRating ?? 0,
    profile?.completionRate ?? 0
  );

  const performance: ProviderPerformanceSnapshot = {
    skillLabels: profile?.skills?.map((s) => s.skill) ?? [],
    completedJobCount: profile?.completedJobCount ?? 0,
    avgRating: profile?.avgRating ?? 0,
    completionRate: profile?.completionRate ?? 0,
    avgResponseTimeHours: profile?.avgResponseTimeHours ?? 0,
    earnedBadgeSlugs: profile?.earnedBadges?.map((b) => b.badgeSlug) ?? [],
    profileCertificationsCount: profile?.certifications?.length ?? 0,
  };

  const rawCourses = await trainingService.listPublished(user);

  const catalog: CatalogCourseInput[] = rawCourses.map((c) => {
    const doc = c as unknown as {
      _id: { toString(): string };
      title: string;
      slug: string;
      description: string;
      category: TrainingCourseCategory;
      enrolled?: boolean;
      enrollmentStatus?: string | null;
    };
    return {
      _id: doc._id.toString(),
      title: doc.title,
      slug: doc.slug,
      description: doc.description ?? "",
      category: doc.category,
      enrolled: doc.enrolled,
      enrollmentStatus: doc.enrollmentStatus,
    };
  });

  let result = buildTrainingRecommendations(performance, catalog);

  // AI polish only for Gold / Elite — deterministic core always returned first if polish skipped or fails
  if (tier.hasAIAccess) {
    result = await polishWithLLM(result);
  }

  return NextResponse.json({
    ...result,
    tier: tier.tier,
    aiPolished: tier.hasAIAccess,
  });
});
