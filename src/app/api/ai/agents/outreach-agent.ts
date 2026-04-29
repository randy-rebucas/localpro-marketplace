/**
 * Outreach Agent
 * Generates personalized outreach messages for customer engagement
 * POST /api/ai/agents/outreach-agent
 * Internal endpoint — requires INTERNAL_API_KEY bearer token
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface OutreachInput {
  userId: string;
  userProfile: {
    role: "client" | "provider";
    name: string;
    accountAgeInDays: number;
    engagementLevel: "inactive" | "low" | "medium" | "high";
  };
  actionType:
    | "fund_escrow"
    | "complete_profile"
    | "leave_review"
    | "recommend_provider"
    | "recommend_job"
    | "return_to_app"
    | "upsell_plan";
  context: {
    jobId?: string;
    jobTitle?: string;
    pendingAmount?: number;
    lastEngagementDaysAgo: number;
    recommendedItems?: Array<{ id: string; title: string; relevanceScore: number }>;
  };
}

export const POST = withHandler(async (req: NextRequest) => {
  const internalKey = process.env.INTERNAL_API_KEY;
  const auth = req.headers.get("authorization");
  if (!internalKey || auth !== `Bearer ${internalKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const input: OutreachInput = await req.json();

  let channel: "email" | "push" | "sms" = "email";
  if (input.userProfile.engagementLevel === "high") channel = "push";
  if (input.actionType === "fund_escrow") channel = "sms";

  let bestHour = 10;
  if (input.userProfile.role === "provider") bestHour = 14;
  const bestDay = 3;

  const prompt = `You are an expert in personalized customer engagement. Create a compelling outreach message.

User: ${input.userProfile.name} (${input.userProfile.role}, ${input.userProfile.accountAgeInDays} days old, ${input.userProfile.engagementLevel} engagement)
Action: ${input.actionType}
Last Active: ${input.context.lastEngagementDaysAgo} days ago
${input.context.jobTitle ? `Job: ${input.context.jobTitle}` : ""}
${input.context.pendingAmount ? `Pending Amount: ₱${input.context.pendingAmount}` : ""}

Action Context:
${input.actionType === "fund_escrow" ? "User has unfunded escrow - encourage to fund to protect both parties"
  : input.actionType === "complete_profile" ? "User profile incomplete - missing certifications/documents"
  : input.actionType === "leave_review" ? "User completed job - ask for honest review"
  : input.actionType === "recommend_provider" ? "Recommend suitable providers based on history"
  : input.actionType === "recommend_job" ? "Recommend new jobs matching their skills"
  : input.actionType === "return_to_app" ? "User hasn't logged in recently - re-engage"
  : "Suggest premium plan upgrade"}

Create:
1. Engaging subject line
2. Personalized message body (2-3 sentences)
3. Clear call-to-action
4. Best time to send
5. Personalization approach
6. Estimated click rate

Response format:
{
  "subject": "<subject>",
  "body": "<message>",
  "cta": { "text": "<button text>", "url": "<destination>" },
  "channel": "email|push|sms",
  "bestHour": <0-23>,
  "bestDay": <0-6>,
  "personalizationLevel": "high|medium|low",
  "estimatedClickRate": <0-100>
}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a personalization expert. Create messages that drive engagement without being pushy. Return valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const message = JSON.parse(content);

  message.channel = channel;
  message.timing = { bestHour, bestDayOfWeek: bestDay };

  if (input.context.jobTitle) message.personalizationLevel = "high";
  else if (input.userProfile.engagementLevel === "inactive") message.personalizationLevel = "high";
  else message.personalizationLevel = "medium";

  return NextResponse.json({ success: true, outreach: message });
});
