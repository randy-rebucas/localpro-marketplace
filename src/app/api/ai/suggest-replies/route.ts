import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** POST /api/ai/suggest-replies */
export const POST = withHandler(async (req: NextRequest) => {
  await requireUser();

  const { lastMessages, role, jobTitle } = await req.json();

  if (!Array.isArray(lastMessages) || lastMessages.length === 0) {
    throw new ValidationError("At least one message is required.");
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI reply suggestions are not available right now." }, { status: 503 });
  }

  const systemPrompt = `You are a messaging assistant for a Philippine local services marketplace called LocalPro.
A ${role ?? "user"} is chatting about a job${jobTitle ? ` titled "${jobTitle}"` : ""}.
Based on the last few messages, suggest 3 short, natural reply options they could send.
Requirements:
- Each reply should be 1–2 sentences max
- Conversational and professional tone
- Relevant and contextual to the conversation
- Return ONLY a JSON array of 3 strings: ["reply1", "reply2", "reply3"]
- No other text`;

  const conversationSummary = (lastMessages as { body: string; senderRole?: string }[])
    .slice(-5)
    .map((m, i) => `[${i + 1}] ${m.senderRole ?? "user"}: ${m.body}`)
    .join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Recent messages:\n${conversationSummary}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
    let replies: string[] = [];
    try {
      const parsed = JSON.parse(clean);
      replies = Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string").slice(0, 3) : [];
    } catch {
      const bracketStart = clean.indexOf("[");
      const bracketEnd = clean.lastIndexOf("]");
      if (bracketStart !== -1 && bracketEnd > bracketStart) {
        try { replies = JSON.parse(clean.slice(bracketStart, bracketEnd + 1)).slice(0, 3); } catch { replies = []; }
      }
    }

    if (replies.length === 0) {
      return NextResponse.json({ error: "AI returned no suggestions." }, { status: 500 });
    }

    return NextResponse.json({ replies });
  } catch (err) {
    console.error("[OpenAI] suggest-replies failed:", err);
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
});
