import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** POST /api/ai/summarize-dispute */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { reason, jobTitle, raisedByRole, messages } = await req.json();

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    throw new ValidationError("A dispute reason is required.");
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI summarization is not available right now." }, { status: 503 });
  }

  const systemPrompt = `You are a neutral dispute resolution assistant for a Philippine local services marketplace called LocalPro.
Summarize the following dispute for an admin to help them make a fair decision quickly.
Requirements:
- 2–4 sentences maximum
- Identify the core issue in plain language
- Stay completely neutral — do not suggest blame or a decision
- Highlight any key details (e.g. payment amount, nature of complaint, relevant context)
- Output ONLY the summary text, no labels or extra commentary`;

  const contextParts: string[] = [
    jobTitle ? `Job: "${jobTitle}"` : "",
    `Raised by: ${raisedByRole ?? "unknown"}`,
    `Dispute reason: ${reason.trim()}`,
  ].filter(Boolean);

  if (Array.isArray(messages) && messages.length > 0) {
    const msgSummary = (messages as { body: string; senderRole?: string }[])
      .slice(-10)
      .map((m) => `[${m.senderRole ?? "user"}]: ${m.body}`)
      .join("\n");
    contextParts.push(`Recent messages:\n${msgSummary}`);
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextParts.join("\n\n") },
      ],
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!summary) {
      return NextResponse.json({ error: "AI returned an empty summary." }, { status: 500 });
    }

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[OpenAI] summarize-dispute failed:", err);
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
});
