import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ExtractedIntent {
  intent: "ASK_QUESTION" | "CONFIRM_BOOKING" | "ASSIGN_PROVIDER" | "STATUS_UPDATE" | "CANCEL_JOB" | "GENERAL_CHAT" | "RECURRING_SERVICE" | "GET_QUOTE_ESTIMATE" | "MODIFY_JOB" | "ESCALATE_DISPUTE" | "BOOKING_INQUIRY" | "URGENT_SERVICE" | "SWITCH_PROVIDER" | "VENDOR_REQUEST";
  confidence: number;
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
  nextAction: "ASK_QUESTION" | "CONFIRM_BOOKING" | "ASSIGN_PROVIDER" | "STATUS_UPDATE" | "CANCEL_JOB" | "RESPOND_ONLY" | "SHOW_RECURRING_OPTIONS" | "SHOW_PRICE_ESTIMATE" | "MODIFY_JOB_CONFIRM" | "ESCALATE_DISPUTE" | "SHOW_BOOKING_INFO" | "SHOW_URGENT_OPTIONS" | "CONFIRM_PROVIDER_SWITCH" | "VENDOR_INQUIRY_RECEIVED";
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
  const extractionPrompt = `You are an AI dispatcher for LocalPro marketplace. Analyze the user's message and extract intent.

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
- BOOKING_INQUIRY: Questions about HOW to use platform ("how do I", "how does", "requirements", "secure", "process", "steps", "background check", "payment", "escrow", "guarantee")
- VENDOR_REQUEST: Vendor/partner inquiries ("partnership", "vendor account", "become a provider", "work with us", "api access", "wholesale", "bulk", "white label")
- SWITCH_PROVIDER: User wants different provider ("switch", "different", "change provider", "not working out", "replace", "someone else")
- URGENT_SERVICE: Emergency same-day services ("emergency", "urgent!", "right now", "asap", "immediately", "today", "within hours", "now")
- RECURRING_SERVICE: Keywords like "weekly", "monthly", "bi-weekly", "every", "regular", "contract", "recurring"
- GET_QUOTE_ESTIMATE: Price questions ("how much", "cost", "price", "budget", "expensive", "affordable")
- MODIFY_JOB: Change request ("reschedule", "change", "move", "postpone", "tomorrow instead", "can I")
- ESCALATE_DISPUTE: Quality/payment issues ("poor quality", "bad work", "overcharge", "refund", "safety")
- GENERAL_CHAT: Other questions about platform

EXAMPLE DETECTIONS:
"I need weekly cleaning" → RECURRING_SERVICE + frequency: weekly
"How much to paint?" → GET_QUOTE_ESTIMATE + category: painting
"Can I change to tomorrow?" → MODIFY_JOB + newDate: tomorrow
"The work is bad" → ESCALATE_DISPUTE + severity: medium
"How do I post a job?" → BOOKING_INQUIRY + questionType: process
"How is payment secure?" → BOOKING_INQUIRY + questionType: payment
"I need a plumber RIGHT NOW!" → URGENT_SERVICE + urgency: emergency
"It's urgent, can someone come today?" → URGENT_SERVICE + urgency: same_day
"There's an issue with the current provider" → SWITCH_PROVIDER + switchReason: not_working_out
"Can we partner with LocalPro?" → VENDOR_REQUEST + vendorType: agency
"What's the API access like?" → VENDOR_REQUEST + inquiryType: api_access

Respond ONLY with valid JSON (no markdown):
{
  "intent": "one of the above",
  "confidence": 0-1,
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
    "disputeSeverity": "low|medium|high or null"
  },
  "clarifyingQuestions": ["q1", "q2"] if ASK_QUESTION,
  "nextAction": "appropriate action based on intent"
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      temperature: 0.5,
      messages: [
        ...conversationHistory,
        { role: "user", content: extractionPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(content);

    return {
      intent: parsed.intent || "GENERAL_CHAT",
      confidence: parsed.confidence || 0.5,
      extractedData: parsed.extractedData || {},
      clarifyingQuestions: parsed.clarifyingQuestions || [],
      nextAction: parsed.nextAction || "RESPOND_ONLY",
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
    actionData = {
      action: "ASSIGN_PROVIDER",
      jobData: intent.extractedData,
    };
  } else if (intent.nextAction === "CONFIRM_BOOKING") {
    if (intent.extractedData.isConfirmation) {
      responseContent =
        "Perfect! Confirming your booking and notifying the provider...";
      actionData = {
        action: "CONFIRM_BOOKING",
        bookingData: conversationState?.selectedProvider,
      };
    } else {
      responseContent =
        "Please confirm the booking details to proceed.";
      actionData = {
        action: "CONFIRM_BOOKING",
        bookingData: conversationState?.selectedProvider,
      };
    }
  } else {
    // General chat response
    const systemPrompt = `You are a helpful LocalPro assistant. You help users navigate the platform, answer questions about services, provide guidance on posting jobs or finding providers, and offer support.

LocalPro is a trusted marketplace for local service professionals in the Philippines and beyond. Key features:
- Post jobs and receive quotes from KYC-verified providers
- Secure payments with escrow protection
- Rated and reviewed service professionals
- Categories include: plumbing, electrical work, cleaning, carpentry, painting, HVAC repair, and more
- Recurring services (weekly, monthly contracts)
- Free consultations available
- Job modifications & rescheduling

Guidelines:
- Be friendly, professional, and concise
- Provide helpful information about using the platform
- If you don't know something, say so and suggest contacting support
- Keep responses to 2-3 sentences when possible
- For account issues, direct users to contact support
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
  });
});
