import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * POST /api/ai/summarize-chat
 * Body: { messages: { body: string; senderRole: string }[]; jobTitle?: string }
 * Returns: { summary: string; agreements: string[]; nextSteps: string[] }
 */
export const POST = withHandler(async (req: NextRequest) => {
  await requireUser();

  const { messages, jobTitle } = await req.json() as {
    messages: { body: string; senderRole: string }[];
    jobTitle?: string;
  };

  if (!Array.isArray(messages) || messages.length < 2) {
    throw new ValidationError("At least 2 messages are required for a summary.");
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "AI summary is not available right now." },
      { status: 503 }
    );
  }

  const conversationText = messages
    .map((m) => `[${m.senderRole ?? "user"}]: ${m.body}`)
    .join("\n");

  const systemPrompt = `You are a helpful assistant for a Philippine local services marketplace called LocalPro.
Analyze the following conversation between a client and a service provider${jobTitle ? ` regarding the job "${jobTitle}"` : ""}.
Provide a structured summary with:
1. A brief 2-3 sentence overall summary of what was discussed and agreed
2. A list of concrete agreements made (what will be done, timeline, price, etc.)
3. A list of suggested next steps for both parties

Return ONLY valid JSON in this exact format with no extra text:
{
  "summary": "...",
  "agreements": ["agreement 1", "agreement 2"],
  "nextSteps": ["step 1", "step 2"]
}`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: conversationText },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
  try {
    const parsed = JSON.parse(raw) as {
      summary?: string;
      agreements?: string[];
      nextSteps?: string[];
    };
    return NextResponse.json({
      summary: parsed.summary ?? "Could not generate summary.",
      agreements: parsed.agreements ?? [],
      nextSteps: parsed.nextSteps ?? [],
    });
  } catch {
    return NextResponse.json(
      { error: "Could not parse AI response. Please try again." },
      { status: 500 }
    );
  }
});
