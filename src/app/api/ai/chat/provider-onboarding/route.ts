import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const faqDatabase = [
  {
    keywords: ["sign up", "apply", "become a provider", "list services", "join as"],
    title: "Applying as a provider",
    answer:
      "To offer services on LocalPro:\n1. Create an account and choose the provider profile path\n2. Complete identity verification (KYC) and any category credentials\n3. Set your service areas, rates, and availability\n4. Pass quality review; then you can receive job invitations and quotes\nAccuracy matters—profiles that match real skills and documents move through fastest.",
    links: [{ text: "Provider help center", url: "/help/providers" }],
  },
  {
    keywords: ["kyc", "verify", "documents", "background", "credential"],
    title: "Verification & quality",
    answer:
      "Provider Onboarding & QC reviews identity documents, skills evidence where required, and marketplace conduct standards. This protects customers and legitimate providers. Typical checks include government ID match and (where applicable) trade certifications.",
    links: [{ text: "Verification overview", url: "/help/provider-verification" }],
  },
];

export const POST = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit(`provider-onboarding:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
  const routing = body.routing && typeof body.routing === "object" ? body.routing : {};
  if (!userMessage.trim()) {
    return NextResponse.json({ error: "Missing or invalid userMessage" }, { status: 400 });
  }

  const trimmedMessage = userMessage.slice(0, 500);

  const relevantFAQs = faqDatabase
    .filter((faq) =>
      faq.keywords.some((keyword) => trimmedMessage.toLowerCase().includes(keyword))
    )
    .slice(0, 2);

  if (relevantFAQs.length > 0) {
    let responseMessage = "";
    for (const faq of relevantFAQs) {
      responseMessage += `**${faq.title}**\n\n${faq.answer}\n\n`;
    }
    if (relevantFAQs[0]?.links?.length) {
      responseMessage += `**Learn more:**\n`;
      relevantFAQs[0].links.forEach((link) => {
        responseMessage += `• [${link.text}](${link.url})\n`;
      });
    }
    return NextResponse.json({
      message: responseMessage,
      source: "FAQ_DATABASE",
      faqsShown: relevantFAQs.length,
      nextAction: "CONTINUE_CHAT",
    });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json({ error: "AI service is not available" }, { status: 503 });
  }

  const aiResponse = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `You are LocalPro's Provider Onboarding & Quality Control assistant. Explain how individuals apply as service providers, verification expectations, and timelines. Do not promise approval; encourage accurate submissions. Keep responses concise and actionable. Philippines marketplace context. Routing context: ${JSON.stringify(routing)}`,
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
