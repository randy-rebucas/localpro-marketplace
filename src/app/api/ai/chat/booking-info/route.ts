import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// FAQ Knowledge Base
const faqDatabase = [
  {
    keywords: ["how do i", "how can i", "post", "job", "create"],
    title: "How to Post a Job",
    answer:
      "To post a job on LocalPro:\n1. Click 'Post a Job' from the main menu\n2. Select your service category (plumbing, electrical, cleaning, etc.)\n3. Describe what you need and provide your budget\n4. Set your location and preferred timeline\n5. Review and submit\n6. You'll receive quotes from certified providers within hours!",
    links: [
      { text: "Step-by-step guide", url: "/help/post-job" },
      { text: "Service categories", url: "/help/categories" },
    ],
  },
  {
    keywords: ["payment", "secure", "safe", "escrow", "how does"],
    title: "Payment & Security",
    answer:
      "LocalPro payments are protected by escrow:\n• Your payment is held securely until work is completed\n• Provider cannot access funds until you confirm completion\n• You can request modifications if needed\n• Full refund guarantee if not satisfied\n• All providers are KYC-verified and background checked\n• Disputes are resolved by our support team within 24 hours",
    links: [
      { text: "Payment methods", url: "/help/payment-methods" },
      { text: "Escrow protection details", url: "/help/escrow" },
      { text: "Safety & verification", url: "/help/safety" },
    ],
  },
  {
    keywords: ["requirements", "needed", "information", "details", "what"],
    title: "What You Need to Post a Job",
    answer:
      "To post a job, have ready:\n• Clear description of what you need (be specific!)\n• Your budget range (helps match right providers)\n• Your location/address (for provider matching)\n• Preferred date/time for the work\n• Any special requirements or preferences\n• Contact number for provider coordination\nTip: More details = better provider matches!",
    links: [
      { text: "Job description tips", url: "/help/write-good-description" },
    ],
  },
  {
    keywords: ["background", "check", "verified", "certified", "trust"],
    title: "Provider Verification & Background Checks",
    answer:
      "All LocalPro providers are:\n• KYC-verified (Know Your Customer identity verification)\n• Subject to background checks\n• Rated and reviewed by previous customers\n• Insurance-verified where applicable\n• Committed to our Code of Conduct\nYou can see provider ratings, reviews, and verification badges on their profiles. Only hire providers you're comfortable with!",
    links: [
      { text: "How provider verification works", url: "/help/provider-verification" },
      { text: "Read provider reviews", url: "/help/reviews" },
    ],
  },
  {
    keywords: ["not happy", "satisfied", "unhappy", "guarantee", "refund"],
    title: "What if I'm Not Happy?",
    answer:
      "LocalPro guarantees your satisfaction:\n• If work quality issues exist, we can arrange a re-do\n• If you're not satisfied, we can help find a replacement provider\n• Full refund available for major issues (within terms)\n• Escalate disputes to our support team anytime\n• Response within 24 hours guaranteed\nYour satisfaction is our priority!",
    links: [
      { text: "Quality guarantee details", url: "/help/guarantee" },
      { text: "Dispute resolution process", url: "/help/disputes" },
    ],
  },
  {
    keywords: ["how long", "timeline", "hours", "days", "response", "eta"],
    title: "How Long Does Everything Take?",
    answer:
      "LocalPro timeline:\n• Job posting → receive quotes: Usually within 2-4 hours\n• Booking confirmation: Immediate\n• Provider arrival: Depends on availability (same-day options available)\n• Work completion: Varies by job type\n• Payment release: After you confirm completion\nUrgent jobs available for same-day service!",
    links: [
      { text: "Urgent service options", url: "/help/urgent-jobs" },
      { text: "Typical project timelines", url: "/help/timelines" },
    ],
  },
  {
    keywords: ["recurring", "weekly", "monthly", "contract", "schedule"],
    title: "Recurring & Scheduled Services",
    answer:
      "Need regular service? LocalPro supports recurring jobs:\n• Weekly, bi-weekly, monthly, or custom schedules\n• Lock in provider and rates\n• Auto-payment setup available\n• Easy to pause or cancel anytime\n• Great for cleaning, maintenance, landscaping, etc.\nASK: 'I need weekly cleaning' to get started!",
    links: [
      { text: "Recurring service guide", url: "/help/recurring-jobs" },
    ],
  },
  {
    keywords: ["price", "cost", "budget", "afford", "estimate"],
    title: "How Much Does It Cost?",
    answer:
      "Pricing varies by service type:\n• Cleaning services: typically ₱1,000 - ₱3,000\n• Plumbing/Electrical: typically ₱2,000 - ₱8,000\n• Carpentry/Painting: typically ₱2,500 - ₱10,000\nUse our price estimate tool to get market rates for your area and service type. Providers give custom quotes based on your specific needs.",
    links: [
      { text: "Price estimate tool", url: "/help/price-estimate" },
      { text: "Pricing by category", url: "/help/category-pricing" },
    ],
  },
  {
    keywords: ["cancel", "cancellation", "refund", "withdraw", "money back"],
    title: "Can I Cancel or Get a Refund?",
    answer:
      "Cancellation & refunds:\n• Before provider arrives: Full refund\n• After work starts: Provider paid for time spent\n• Quality issues: Escalate for resolution\n• Unsatisfied: Speak to support team\nNo cancellation fees or hidden charges. Our goal is to make things right!",
    links: [
      { text: "Cancellation policy", url: "/help/cancellation" },
      { text: "Contact support", url: "/help/contact-support" },
    ],
  },
];

export const POST = withHandler(async (req: NextRequest) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit(`booking-info:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { userMessage } = await req.json();
  if (!userMessage || typeof userMessage !== "string") {
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
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are a helpful LocalPro assistant. Answer questions about how the booking process works, payment security, provider verification, and platform features.

LocalPro is a trusted marketplace for local services in the Philippines:
- Secure payments with escrow protection
- KYC-verified providers with background checks
- Rated and reviewed professionals
- Services include: plumbing, electrical, cleaning, carpentry, painting, HVAC, landscaping, and more
- Same-day and recurring service options available

Be friendly, clear, and direct. Keep responses concise (2-3 sentences) unless more detail is needed.`,
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
