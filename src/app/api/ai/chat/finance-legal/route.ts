import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const POST = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit(`finance-legal:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
  const routing = body.routing && typeof body.routing === "object" ? body.routing : {};

  if (!userMessage.trim()) {
    return NextResponse.json({ error: "Missing or invalid userMessage" }, { status: 400 });
  }

  const trimmedMessage = userMessage.slice(0, 800);

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI service is not available" }, { status: 503 });
  }

  const aiResponse = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 450,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `You assist with general Finance & Legal orientation for LocalPro users (invoices, payouts, commissions, tax paperwork orientation, compliance FAQs). You are NOT a lawyer or accountant. Never draft binding contracts or give legal/tax advice—tell users to use official support, dashboards, or licensed professionals for specifics. Flag fraud, disputes over active jobs, or safety issues for human support. Routing context: ${JSON.stringify(routing)}`,
      },
      { role: "user", content: trimmedMessage },
    ],
  });

  const aiMessage = aiResponse.choices[0]?.message?.content ?? "";
  return NextResponse.json({
    message: aiMessage,
    source: "AI_GENERATED",
    nextAction: "CONTINUE_CHAT",
  });
});
