/**
 * INTEGRATION EXAMPLE: Support Ticket Handler
 * 
 * This demonstrates how to integrate the Support Agent into your existing support system.
 * When a customer creates a new support ticket, the Support Agent analyzes it and either:
 * 1. Generates a response directly (low-risk FAQ issues)
 * 2. Queues it for your approval (complex/urgent issues)
 * 
 * Usage:
 * POST /api/admin/support/tickets/create-with-ai
 * {
 *   "userId": "customer-id",
 *   "category": "billing",
 *   "subject": "Payment failed",
 *   "message": "My payment via GCash failed but I still see a charge..."
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";

interface SupportTicketInput {
  userId: string;
  category: string;
  subject: string;
  message: string;
}

export const POST = withHandler(async (req: NextRequest) => {
  await connectDB();
  const user = await requireUser();

  const body: SupportTicketInput = await req.json();

  // Validation
  if (!body.userId || !body.category || !body.subject || !body.message) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    // Call Support Agent for AI analysis and response
    const aiResponse = await fetch(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "/api/ai/agents/support-agent",
          payload: {
            ticketId: null, // Will be generated when ticket is created
            userId: body.userId,
            message: body.message,
            category: body.category,
            previousMessages: [], // First message, so no history
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      throw new Error("AI agent failed");
    }

    const aiAnalysis = await aiResponse.json();

    // Example response:
    // {
    //   decision: {
    //     id: "60d5ec49c1234567890abcde",
    //     status: "approved" | "pending_review",
    //     confidence: 85,
    //     riskLevel: "low" | "medium" | "high"
    //   },
    //   response: "Thank you for reaching out. Here's how to resolve payment issues..."
    //   message: "Response sent to customer" | "Response queued for approval"
    // }

    // TODO: In your real implementation:
    // 1. Create a SupportTicket document in MongoDB
    // 2. If aiAnalysis.decision.status === "approved":
    //    - Send aiAnalysis.response directly to the customer
    //    - Mark ticket as auto-resolved
    // 3. If aiAnalysis.decision.status === "pending_review":
    //    - Save ticket with status "pending_approval"
    //    - You'll review in the AI Approval Dashboard
    //    - When you approve, send the response to customer

    return NextResponse.json(
      {
        ticketId: "placeholder", // Replace with actual ticket ID
        aiDecision: aiAnalysis.decision,
        aiResponse: aiAnalysis.response,
        status: aiAnalysis.decision.status === "approved" ? "auto_resolved" : "pending_approval",
        message: aiAnalysis.message,
      },
      { status: aiAnalysis.decision.status === "approved" ? 200 : 202 }
    );
  } catch (error) {
    console.error("[Support Ticket AI Integration] error:", error);
    return NextResponse.json(
      { error: "Failed to process support ticket with AI" },
      { status: 500 }
    );
  }
});

// IMPLEMENTATION CHECKLIST:
//
// [ ] Step 1: Call Support Agent when new ticket is created
//     const aiAnalysis = await fetch("/api/ai/agents/support-agent", {
//       method: "POST",
//       body: JSON.stringify({
//         message: ticketMessage,
//         category: ticketCategory
//       })
//     })
//
// [ ] Step 2: Check decision status
//     if (aiAnalysis.decision.status === "approved") {
//       // Send response directly to customer
//       // Mark ticket as resolved
//     } else if (aiAnalysis.decision.status === "pending_review") {
//       // Save ticket with pending status
//       // You'll see it in /admin/approval-queue dashboard
//     }
//
// [ ] Step 3: When you approve in dashboard
//     - Decision becomes approved
//     - Send notification to customer with the approved response
//     - Mark ticket as resolved
//
// [ ] Step 4: Track feedback
//     - After customer responds or rates the resolution
//     - Call AIDecisionService.recordFeedback()
//     - This trains the agent for next time
//
// EXAMPLE: Billing category common questions
// Message: "I was charged twice for the same job"
// AI should detect: Payment issue, financial loss → Escalate to support
//
// Message: "How do I request a refund?"
// AI should detect: FAQ question → Respond directly with refund process
//
// EXAMPLE: Dispute category
// Message: "The provider didn't show up!"
// AI should detect: Urgent, customer frustrated → Flag for immediate approval
