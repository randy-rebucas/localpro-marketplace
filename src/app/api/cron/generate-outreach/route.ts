/**
 * Outreach Generator Handler
 * Generates personalized engagement messages
 * POST /api/cron/generate-outreach
 * 
 * Calls Outreach Agent to:
 * - Generate personalized re-engagement messages
 * - Determine optimal send time
 * - Select communication channel (email, push, SMS)
 * - Schedule delivery
 */

import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";
import { connectDB } from "@/lib/db";

export const POST = withHandler(async (req: NextRequest) => {
  // Verify cron request
  const authHeader = req.headers.get("Authorization");
  const expectedToken = process.env.CRON_AUTH_TOKEN;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    throw new ValidationError("Unauthorized cron request");
  }

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const {
    userId,
    actionType = "fund_escrow", // or: complete_profile, leave_review, recommend_provider, return_to_app, upsell_plan
    context = {},
  } = body;

  if (!userId) {
    throw new ValidationError("userId is required");
  }

  // TODO: Fetch user profile from database
  // const user = await userRepository.getDocById(userId);
  // const userProfile = {
  //   role: user.role,
  //   engagementLevel: user.engagementLevel,
  //   ...
  // };

  // For now, accept user profile from request
  const userProfile = body.userProfile || {
    role: body.role || "client",
    engagementLevel: body.engagementLevel || "medium",
    lastActiveAt: body.lastActiveAt,
    joinedAt: body.joinedAt,
  };

  try {
    // Call Outreach Agent
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${appUrl}/api/ai/agents/outreach-agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
      },
      body: JSON.stringify({
        userId,
        userProfile,
        actionType,
        context,
      }),
    });

    if (!response.ok) {
      console.error("[Outreach Handler] AI agent failed:", response.status);
      throw new Error("Outreach generation service failed");
    }

    const aiResult = await response.json();
    const outreach = aiResult.outreach;

    // TODO: Schedule message delivery
    // await notificationService.scheduleMessage({
    //   userId,
    //   channel: outreach.channel,
    //   message: {
    //     subject: outreach.subject,
    //     body: outreach.body,
    //     cta: outreach.cta,
    //   },
    //   scheduleAt: calculateDeliveryTime(outreach.bestHour, outreach.bestDay),
    // });

    return NextResponse.json({
      success: true,
      userId,
      outreach: {
        channel: outreach.channel,
        message: {
          subject: outreach.subject,
          body: outreach.body,
          cta: outreach.cta,
        },
        timing: {
          bestHour: outreach.bestHour,
          bestDay: outreach.bestDay,
        },
        personalization: {
          level: outreach.personalizationLevel,
          estimatedClickRate: outreach.estimatedClickRate,
        },
      },
    });
  } catch (error) {
    console.error("[Outreach Handler] Error:", error);
    throw new Error(`Outreach generation failed: ${String(error)}`);
  }
});

/**
 * Calculate optimal delivery time
 * bestHour: 9-17 (business hours)
 * bestDay: "weekday" or "weekend"
 */
function calculateDeliveryTime(bestHour: number, bestDay: string): Date {
  const now = new Date();
  const deliveryDate = new Date(now);

  // Set to desired hour
  deliveryDate.setHours(bestHour, 0, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (deliveryDate < now) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  // If weekend preference but today is weekday, move to next Saturday
  if (bestDay === "weekend") {
    const dayOfWeek = deliveryDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 1;
      deliveryDate.setDate(deliveryDate.getDate() + daysUntilSaturday);
    }
  }

  return deliveryDate;
}
