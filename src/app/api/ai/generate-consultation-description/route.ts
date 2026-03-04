import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import { loyaltyRepository } from "@/repositories";
import { getClientTier } from "@/lib/loyalty";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  // Gate: Gold and Platinum clients only
  const loyaltyAccount = await loyaltyRepository.findByUserId(user.userId);
  const tierInfo = getClientTier(loyaltyAccount?.lifetimePoints ?? 0);
  if (tierInfo.tier !== "gold" && tierInfo.tier !== "platinum") {
    throw new ForbiddenError("AI writing is available for Gold and Platinum members only.");
  }

  const { title, type } = await req.json();
  if (!title || typeof title !== "string" || title.trim().length < 3) {
    throw new ValidationError("A consultation title is required to generate a description.");
  }

  const typeLabel =
    type === "site_inspection" ? "site inspection (in-person visit)" : "remote chat-based assessment";

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 220,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant for a local services marketplace in the Philippines. " +
          "When given a consultation request title and type, write a clear, practical description a homeowner would use " +
          "when requesting a professional consultation. " +
          "Write 2–3 sentences. Cover what needs to be assessed, any relevant context the provider should know, " +
          "and what outcome the client expects from the consultation. " +
          "Use plain language, no markdown, no bullet points.",
      },
      {
        role: "user",
        content: `Consultation title: "${title.trim()}". Type: ${typeLabel}. Write a consultation description.`,
      },
    ],
  });

  const description = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!description) throw new Error("AI returned an empty response. Please try again.");

  return NextResponse.json({ description });
});
