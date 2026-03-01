import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** POST /api/ai/classify-category */
export const POST = withHandler(async (req: NextRequest) => {
  await requireUser();

  const { title, description, availableCategories } = await req.json();

  if (!title || typeof title !== "string" || title.trim().length < 3) {
    throw new ValidationError("A job title is required to classify category.");
  }

  if (!Array.isArray(availableCategories) || availableCategories.length === 0) {
    throw new ValidationError("Available categories list is required.");
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI category detection is not available right now." }, { status: 503 });
  }

  const systemPrompt = `You are a job categorization assistant for a Philippine local services marketplace called LocalPro.
Given a job title and optional description, choose the single best matching category from the provided list.
Return ONLY a JSON object: {"category": "<exact category name from the list>"}
The category MUST exactly match one from the list. No other text.`;

  const userPrompt = [
    `Job title: ${title.trim()}`,
    description ? `Description: ${String(description).slice(0, 200)}` : null,
    `Available categories: ${(availableCategories as string[]).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 60,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { category?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned an invalid response." }, { status: 500 });
    }

    const category = parsed.category?.trim();
    if (!category || !(availableCategories as string[]).includes(category)) {
      // Try case-insensitive match
      const match = (availableCategories as string[]).find(
        (c) => c.toLowerCase() === category?.toLowerCase()
      );
      if (match) return NextResponse.json({ category: match });
      return NextResponse.json({ error: "Could not confidently classify this job." }, { status: 422 });
    }

    return NextResponse.json({ category });
  } catch (err) {
    console.error("[OpenAI] classify-category failed:", err);
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
});
