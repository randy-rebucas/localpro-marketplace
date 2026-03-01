import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** POST /api/ai/estimate-budget */
export const POST = withHandler(async (req: NextRequest) => {
  await requireUser();

  const { title, category, description } = await req.json();

  if (!title || typeof title !== "string" || title.trim().length < 3) {
    throw new ValidationError("A job title is required to estimate a budget.");
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI budget estimation is not available right now." }, { status: 503 });
  }

  const systemPrompt = `You are a pricing expert for a Philippine local home services marketplace called LocalPro.
Given a job title, category, and optional description, estimate a fair budget range in Philippine Pesos (PHP).
Base your estimates on typical rates for Filipino freelance service workers.
Return ONLY a JSON object with this exact shape:
{"min": <number>, "max": <number>, "midpoint": <number>, "note": "<one short sentence explaining the estimate>"}
No other text. All amounts must be realistic PHP integers (no decimals).`;

  const userPrompt = [
    `Job title: ${title.trim()}`,
    category ? `Category: ${category}` : null,
    description ? `Description: ${String(description).slice(0, 300)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 150,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { min?: number; max?: number; midpoint?: number; note?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned an invalid response." }, { status: 500 });
    }

    if (!parsed.min || !parsed.max) {
      return NextResponse.json({ error: "Could not estimate budget for this job." }, { status: 500 });
    }

    return NextResponse.json({
      min: Math.round(parsed.min),
      max: Math.round(parsed.max),
      midpoint: parsed.midpoint ? Math.round(parsed.midpoint) : Math.round((parsed.min + parsed.max) / 2),
      note: parsed.note ?? "",
    });
  } catch (err) {
    console.error("[OpenAI] estimate-budget failed:", err);
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
});
