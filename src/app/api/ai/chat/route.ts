import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ExtractedIntent {
  intent:
    | "ASK_QUESTION"
    | "CONFIRM_BOOKING"
    | "ASSIGN_PROVIDER"
    | "STATUS_UPDATE"
    | "CANCEL_JOB"
    | "GENERAL_CHAT"
    | "RECURRING_SERVICE"
    | "GET_QUOTE_ESTIMATE"
    | "MODIFY_JOB"
    | "ESCALATE_DISPUTE"
    | "BOOKING_INQUIRY"
    | "URGENT_SERVICE"
    | "SWITCH_PROVIDER"
    | "VENDOR_REQUEST"
    | "MARKETING_OUTREACH"
    | "FINANCE_LEGAL_INQUIRY"
    | "PROVIDER_ONBOARDING";
  confidence: number;
  /** Orchestrator-style routing hints when confident (see Orchestration.md) */
  requestType?: string;
  stakeholderType?: string;
  primaryTeam?: string;
  extractedData: {
    jobTitle?: string;
    description?: string;
    budget?: number;
    budgetMin?: number;
    budgetMax?: number;
    category?: string;
    location?: string;
    urgency?: "standard" | "same_day" | "rush";
    isConfirmation?: boolean;
    jobIdToCancel?: string;
    frequency?: "daily" | "weekly" | "bi-weekly" | "monthly" | "quarterly" | "yearly";
    recurringBudget?: number;
    modificationsDays?: number;
    newDate?: string;
    newTime?: string;
    scopeChange?: "add" | "remove" | "reduce";
    disputeReason?: string;
    disputeSeverity?: "low" | "medium" | "high";
    switchReason?: "poor_work" | "not_responding" | "other";
    switchFeedback?: string;
    vendorType?: "sole_proprietor" | "small_team" | "agency" | "enterprise";
    businessName?: string;
    inquiryType?: "vendor_account" | "partnership" | "api_access" | "white_label";
  };
  clarifyingQuestions?: string[];
  nextAction:
    | "ASK_QUESTION"
    | "CONFIRM_BOOKING"
    | "ASSIGN_PROVIDER"
    | "STATUS_UPDATE"
    | "CANCEL_JOB"
    | "RESPOND_ONLY"
    | "SHOW_RECURRING_OPTIONS"
    | "SHOW_PRICE_ESTIMATE"
    | "MODIFY_JOB_CONFIRM"
    | "ESCALATE_DISPUTE"
    | "SHOW_BOOKING_INFO"
    | "SHOW_URGENT_OPTIONS"
    | "CONFIRM_PROVIDER_SWITCH"
    | "VENDOR_INQUIRY_RECEIVED"
    | "SHOW_MARKETING_INFO"
    | "SHOW_FINANCE_LEGAL_INFO"
    | "SHOW_PROVIDER_ONBOARDING_INFO";
}

// Zod schema for the JSON blob we expect OpenAI to return
const IntentResponseSchema = z.object({
  intent: z.string().default("GENERAL_CHAT"),
  confidence: z.number().min(0).max(1).default(0.5),
  extractedData: z.record(z.unknown()).default({}),
  clarifyingQuestions: z.array(z.string()).default([]),
  nextAction: z.string().default("RESPOND_ONLY"),
  requestType: z.string().optional(),
  stakeholderType: z.string().optional(),
  primaryTeam: z.string().optional(),
});

/**
 * Map service category to specialized booking endpoint
 */
function getSpecializedBookingEndpoint(
  category?: string
): string | null {
  if (!category) return null;

  const categoryLower = category.toLowerCase();

  // Map categories to specialized endpoints
  if (
    categoryLower.includes("plumbing") ||
    categoryLower.includes("electrical") ||
    categoryLower.includes("hvac")
  ) {
    return "/api/ai/chat/booking-plumbing-electrical";
  } else if (categoryLower.includes("cleaning")) {
    return "/api/ai/chat/booking-cleaning";
  } else if (
    categoryLower.includes("beauty") ||
    categoryLower.includes("salon") ||
    categoryLower.includes("spa")
  ) {
    return "/api/ai/chat/booking-beauty";
  } else if (
    categoryLower.includes("construction") ||
    categoryLower.includes("carpentry") ||
    categoryLower.includes("painting") ||
    categoryLower.includes("labor")
  ) {
    return "/api/ai/chat/booking-construction";
  } else if (
    categoryLower.includes("food") ||
    categoryLower.includes("culinary") ||
    categoryLower.includes("catering")
  ) {
    return "/api/ai/chat/booking-food";
  } else if (
    categoryLower.includes("it") ||
    categoryLower.includes("tech") ||
    categoryLower.includes("computer") ||
    categoryLower.includes("software") ||
    categoryLower.includes("hardware")
  ) {
    return "/api/ai/chat/booking-it";
  }

  return null; // Fall back to generic confirm-booking
}

/**
 * Extract intent and structured data from user message using OpenAI
 */
async function extractIntent(
  client: OpenAI,
  userMessage: string,
  conversationHistory: ChatMessage[],
  conversationState?: any
): Promise<ExtractedIntent> {
  const extractionPrompt = `You are an AI dispatcher for LocalPro marketplace (Master Orchestrator routing layer). Five virtual teams exist: Business Operations, Sales & Partnerships (B2B), Marketing & Outreach, Finance & Legal, and Provider Onboarding & Quality. Map each user message to ONE intent and the correct nextAction; prefer specialized intents over GENERAL_CHAT when confident.

Current state: ${JSON.stringify({
    hasActiveJob: !!conversationState?.jobId,
    activeJobId: conversationState?.jobId,
    bookingInProgress: !!conversationState?.selectedProvider,
  })}

User message: "${userMessage}"

DETECT THESE INTENTS:
- ASK_QUESTION: Incomplete job details (budget, location, urgency, etc)
- ASSIGN_PROVIDER: All job details present, ready to search & assign
- CONFIRM_BOOKING: User accepts booking ("YES", "confirm", "proceed", "ok")
- STATUS_UPDATE: User asks status ("where?", "ETA?", "status?", "how far")
- CANCEL_JOB: User wants to cancel ("cancel", "stop", "abort")
- BOOKING_INQUIRY: Questions about HOW to use platform as a customer ("how do I post", "how does escrow work", "requirements", "background check", "steps")
- VENDOR_REQUEST: B2B/partnership/vendor programs ("partnership with LocalPro", "vendor account", "API access", "white label", "wholesale", "bulk enterprise", "LGU partnership") — use this for commercial/partner programs; NOT consumer help posting a job
- PROVIDER_ONBOARDING: Signing up to OFFER services on the marketplace ("sign up as provider", "apply as cleaner", "provider KYC", "how to list my services", "our team wants to offer services on LocalPro") — teams listing labor use this; API/white-label/LGU deals stay VENDOR_REQUEST
- MARKETING_OUTREACH: Platform marketing, media, sponsorships, co-branding, campaigns WITH LocalPro ("press inquiry", "marketing partnership", "feature our brand", "co-marketing", "sponsor event")
- FINANCE_LEGAL_INQUIRY: Invoices, payouts, commissions, tax docs, contracts, compliance ("commission statement", "invoice copy", "withholding tax", "legal department", "terms dispute" as informational—not active job dispute)
- SWITCH_PROVIDER: User wants different provider ("switch", "different", "change provider", "not working out", "replace", "someone else")
- URGENT_SERVICE: Emergency same-day services ("emergency", "urgent!", "right now", "asap", "immediately", "today", "within hours", "now")
- RECURRING_SERVICE: Keywords like "weekly", "monthly", "bi-weekly", "every", "regular", "contract", "recurring"
- GET_QUOTE_ESTIMATE: Price questions ("how much", "cost", "price", "budget", "expensive", "affordable")
- MODIFY_JOB: Change request ("reschedule", "change", "move", "postpone", "tomorrow instead", "can I")
- ESCALATE_DISPUTE: Active job quality/payment issues ("poor quality", "bad work", "overcharge", "refund this job", "safety")
- GENERAL_CHAT: Other questions about platform

NEXT ACTION MAP:
ASK_QUESTION→ASK_QUESTION | ASSIGN_PROVIDER→ASSIGN_PROVIDER | CONFIRM_BOOKING→CONFIRM_BOOKING | STATUS_UPDATE→STATUS_UPDATE | CANCEL_JOB→CANCEL_JOB | RECURRING_SERVICE→SHOW_RECURRING_OPTIONS | GET_QUOTE_ESTIMATE→SHOW_PRICE_ESTIMATE | MODIFY_JOB→MODIFY_JOB_CONFIRM | ESCALATE_DISPUTE→ESCALATE_DISPUTE | BOOKING_INQUIRY→SHOW_BOOKING_INFO | URGENT_SERVICE→SHOW_URGENT_OPTIONS | SWITCH_PROVIDER→CONFIRM_PROVIDER_SWITCH | VENDOR_REQUEST→VENDOR_INQUIRY_RECEIVED | MARKETING_OUTREACH→SHOW_MARKETING_INFO | FINANCE_LEGAL_INQUIRY→SHOW_FINANCE_LEGAL_INFO | PROVIDER_ONBOARDING→SHOW_PROVIDER_ONBOARDING_INFO | GENERAL_CHAT→RESPOND_ONLY

EXAMPLE DETECTIONS:
"I need weekly cleaning" → RECURRING_SERVICE + frequency: weekly
"How much to paint?" → GET_QUOTE_ESTIMATE + category: painting
"Can I change to tomorrow?" → MODIFY_JOB + newDate: tomorrow
"The work is bad" → ESCALATE_DISPUTE + severity: medium
"How do I post a job?" → BOOKING_INQUIRY + primaryTeam: Business Operations
"How is payment secure?" → BOOKING_INQUIRY
"I need a plumber RIGHT NOW!" → URGENT_SERVICE + urgency: rush
"It's urgent, can someone come today?" → URGENT_SERVICE + urgency: same_day
"There's an issue with the current provider" → SWITCH_PROVIDER
"Can we partner with LocalPro as an agency?" → VENDOR_REQUEST + vendorType: agency + stakeholderType: MSME or Enterprise
"What's the API access like?" → VENDOR_REQUEST + inquiryType: api_access
"I want to apply as a handyman on LocalPro" → PROVIDER_ONBOARDING + stakeholderType: Provider
"We're interested in co-marketing with LocalPro" → MARKETING_OUTREACH + stakeholderType: MSME
"I need my commission statement for taxes" → FINANCE_LEGAL_INQUIRY + primaryTeam: Finance & Legal

OPTIONAL METADATA (omit if unsure): requestType (e.g. Booking, Partnership, Marketing Campaign, Financial Report, Provider Application), stakeholderType (Consumer, Provider, MSME, Enterprise, LGU), primaryTeam (use exact labels above).

Respond ONLY with valid JSON (no markdown):
{
  "intent": "one of the above",
  "confidence": 0-1,
  "requestType": "short label or omit",
  "stakeholderType": "Consumer|Provider|MSME|Enterprise|LGU or omit",
  "primaryTeam": "team name or omit",
  "extractedData": {
    "jobTitle": "or null",
    "description": "or null",
    "budget": number or null,
    "budgetMin": number or null,
    "budgetMax": number or null,
    "category": "or null",
    "location": "or null",
    "urgency": "standard|same_day|rush or null",
    "isConfirmation": true/false,
    "frequency": "daily|weekly|bi-weekly|monthly|quarterly|yearly or null",
    "recurringBudget": number or null,
    "modificationsDays": number or null,
    "newDate": "YYYY-MM-DD or null",
    "newTime": "HH:MM or null",
    "scopeChange": "add|remove|reduce or null",
    "disputeReason": "reason or null",
    "disputeSeverity": "low|medium|high or null",
    "vendorType": "sole_proprietor|small_team|agency|enterprise or null",
    "businessName": "or null",
    "inquiryType": "vendor_account|partnership|api_access|white_label or null",
    "switchReason": "poor_work|not_responding|other or null",
    "switchFeedback": "or null",
    "jobIdToCancel": "or null"
  },
  "clarifyingQuestions": ["q1", "q2"] if ASK_QUESTION else [],
  "nextAction": "from NEXT ACTION MAP only"
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      temperature: 0.5,
      messages: [
        ...conversationHistory,
        { role: "user", content: extractionPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || "{}";
    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      raw = {};
    }
    const parsed = IntentResponseSchema.parse(raw);

    return {
      intent:              parsed.intent as ExtractedIntent["intent"],
      confidence:          parsed.confidence,
      extractedData:       parsed.extractedData as ExtractedIntent["extractedData"],
      clarifyingQuestions: parsed.clarifyingQuestions,
      nextAction:          parsed.nextAction as ExtractedIntent["nextAction"],
      requestType:         parsed.requestType,
      stakeholderType:     parsed.stakeholderType,
      primaryTeam:         parsed.primaryTeam,
    };
  } catch (err) {
    console.error("[Intent extraction failed]:", err);
    return {
      intent: "GENERAL_CHAT",
      confidence: 0,
      extractedData: {},
      nextAction: "RESPOND_ONLY",
    };
  }
}

/** POST /api/ai/chat - AI chat dispatcher with action routing */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:chat:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { messages, context, conversationState } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "AI service is not available right now." },
      { status: 503 }
    );
  }

  const userMessage = messages[messages.length - 1]?.content || "";

  // Extract intent from user message with current state
  const intent = await extractIntent(client, userMessage, [
    {
      role: "system",
      content: `You are LocalPro assistant. Current state: ${JSON.stringify(conversationState || {})}`,
    },
    ...messages.slice(0, -1),
  ], conversationState);

  // Generate response based on next action
  let responseContent = "";
  let actionData = null;

  if (intent.nextAction === "ASK_QUESTION" && intent.clarifyingQuestions?.length) {
    responseContent = `I need a bit more info to help you better:\n\n${intent.clarifyingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
  } else if (intent.nextAction === "STATUS_UPDATE") {
    responseContent = "Let me check your job status...";
    actionData = {
      action: "STATUS_UPDATE",
      jobId: conversationState?.jobId,
    };
  } else if (intent.nextAction === "CANCEL_JOB") {
    responseContent = "I'll cancel your job request right away...";
    actionData = {
      action: "CANCEL_JOB",
      jobId: conversationState?.jobId || intent.extractedData.jobIdToCancel,
    };
  } else if (intent.nextAction === "SHOW_RECURRING_OPTIONS") {
    responseContent = `Great! I found recurring ${intent.extractedData.category || "service"} providers for you. Let me show the best weekly matches...`;
    actionData = {
      action: "RECURRING_SERVICE",
      jobData: intent.extractedData,
    };
  } else if (intent.nextAction === "SHOW_PRICE_ESTIMATE") {
    responseContent = `Let me check pricing for ${intent.extractedData.category || "that service"}...`;
    actionData = {
      action: "GET_QUOTE_ESTIMATE",
      jobData: intent.extractedData,
    };
  } else if (intent.nextAction === "MODIFY_JOB_CONFIRM") {
    responseContent = "Let me update your job details...";
    actionData = {
      action: "MODIFY_JOB",
      jobId: conversationState?.jobId,
      modifications: {
        newDate: intent.extractedData.newDate,
        newTime: intent.extractedData.newTime,
        scopeChange: intent.extractedData.scopeChange,
      },
    };
  } else if (intent.nextAction === "ESCALATE_DISPUTE") {
    responseContent = "I'm escalating this to our support team for resolution...";
    actionData = {
      action: "ESCALATE_DISPUTE",
      jobId: conversationState?.jobId,
      reason: intent.extractedData.disputeReason,
      severity: intent.extractedData.disputeSeverity || "medium",
    };
  } else if (intent.nextAction === "SHOW_BOOKING_INFO") {
    responseContent = "Let me provide some helpful information about our booking process...";
    actionData = {
      action: "BOOKING_INQUIRY",
      userMessage: userMessage,
    };
  } else if (intent.nextAction === "SHOW_MARKETING_INFO") {
    responseContent =
      "I'll connect you with guidance on marketing and outreach with LocalPro...";
    actionData = {
      action: "MARKETING_OUTREACH",
      userMessage,
      routing: {
        requestType: intent.requestType,
        stakeholderType: intent.stakeholderType,
        primaryTeam: intent.primaryTeam ?? "Marketing & Outreach",
      },
    };
  } else if (intent.nextAction === "SHOW_FINANCE_LEGAL_INFO") {
    responseContent =
      "I'll route this to finance and compliance-aware guidance. Human review may be needed for legal or high-risk matters...";
    actionData = {
      action: "FINANCE_LEGAL_INQUIRY",
      userMessage,
      routing: {
        requestType: intent.requestType,
        stakeholderType: intent.stakeholderType,
        primaryTeam: intent.primaryTeam ?? "Finance & Legal",
      },
    };
  } else if (intent.nextAction === "SHOW_PROVIDER_ONBOARDING_INFO") {
    responseContent =
      "Here is how provider onboarding and verification work on LocalPro...";
    actionData = {
      action: "PROVIDER_ONBOARDING",
      userMessage,
      routing: {
        requestType: intent.requestType ?? "Provider Application",
        stakeholderType: intent.stakeholderType ?? "Provider",
        primaryTeam: intent.primaryTeam ?? "Provider Onboarding & Quality Control",
      },
    };
  } else if (intent.nextAction === "SHOW_URGENT_OPTIONS") {
    responseContent = `⚡ I understand this is urgent! Let me find providers who can help you TODAY...`;
    actionData = {
      action: "URGENT_SERVICE",
      jobData: intent.extractedData,
    };
  } else if (intent.nextAction === "CONFIRM_PROVIDER_SWITCH") {
    responseContent = `I understand you'd like to switch providers. Let me find better options for you...`;
    actionData = {
      action: "SWITCH_PROVIDER",
      jobData: intent.extractedData,
      jobId: conversationState?.jobId,
      reason: intent.extractedData.switchReason || "other",
      feedback: intent.extractedData.switchFeedback,
    };
  } else if (intent.nextAction === "VENDOR_INQUIRY_RECEIVED") {
    responseContent = "Thank you for your interest in partnering with LocalPro! Our team will contact you shortly...";
    actionData = {
      action: "VENDOR_REQUEST",
      vendorData: {
        businessName: intent.extractedData.businessName,
        vendorType: intent.extractedData.vendorType || "sole_proprietor",
        inquiryType: intent.extractedData.inquiryType || "vendor_account",
        message: userMessage,
      },
      userEmail: user?.userId || "unknown@localpro.com",
    };
  } else if (intent.nextAction === "ASSIGN_PROVIDER") {
    responseContent =
      "Great! I found some perfect providers for you. Let me show you the best matches. (Searching providers...)";

    // Determine if specialized endpoint should be used
    const specializedEndpoint = getSpecializedBookingEndpoint(
      intent.extractedData.category
    );

    actionData = {
      action: "ASSIGN_PROVIDER",
      jobData: intent.extractedData,
      specializedEndpoint: specializedEndpoint, // Route to service-specific handler if available
    };
  } else if (intent.nextAction === "CONFIRM_BOOKING") {
    if (intent.extractedData.isConfirmation) {
      responseContent =
        "Perfect! Confirming your booking and notifying the provider...";

      // Determine if specialized endpoint should be used
      const specializedEndpoint = getSpecializedBookingEndpoint(
        intent.extractedData.category
      );

      actionData = {
        action: "CONFIRM_BOOKING",
        bookingData: conversationState?.selectedProvider,
        specializedEndpoint: specializedEndpoint, // Route to service-specific handler if available
        jobData: intent.extractedData,
      };
    } else {
      responseContent =
        "Please confirm the booking details to proceed.";
      actionData = {
        action: "CONFIRM_BOOKING",
        bookingData: conversationState?.selectedProvider,
        jobData: intent.extractedData,
      };
    }
  } else {
    // General chat response
    const systemPrompt = `You are a helpful LocalPro assistant aligned with the Master Orchestrator operating model: prioritize customer satisfaction, provider welfare, and partner success; stay consistent with Philippine regulations and fair marketplace practices.

You help users navigate the platform, answer questions about services, provide guidance on posting jobs or finding providers, and offer support.

LocalPro is a trusted marketplace for local service professionals in the Philippines and beyond. Key features:
- Post jobs and receive quotes from KYC-verified providers
- Secure payments with escrow protection
- Rated and reviewed service professionals
- Categories include: plumbing, electrical work, cleaning, carpentry, painting, HVAC repair, and more
- Recurring services (weekly, monthly contracts)
- Free consultations available
- Job modifications & rescheduling

Guidelines:
- Professional, clear, solution-oriented; adapt tone to the audience (consumers, providers, businesses)
- Be friendly and concise; keep responses to 2-3 sentences when possible unless more detail is necessary
- Protect privacy: do not invent stakeholder names, IDs, amounts, or documents
- If you don't know something, say so and suggest contacting support
- For account issues, direct users to contact support
- Escalate when topics require licensed legal counsel, binding financial decisions, fraud/safety risk, or strategic commitments beyond standard policies—say that a human administrator or official channel should review
${context ? `\nAdditional context: ${context}` : ""}`;

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      });

      responseContent = completion.choices[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.error("[OpenAI] general chat failed:", err);
      responseContent =
        "Sorry, I had trouble processing that. Please try again.";
    }
  }

  return NextResponse.json({
    message: responseContent,
    role: "assistant",
    timestamp: new Date().toISOString(),
    intent: intent.intent,
    nextAction: intent.nextAction,
    extractedData: intent.extractedData,
    action: actionData,
    ...(intent.requestType && { requestType: intent.requestType }),
    ...(intent.stakeholderType && { stakeholderType: intent.stakeholderType }),
    ...(intent.primaryTeam && { primaryTeam: intent.primaryTeam }),
  });
});
