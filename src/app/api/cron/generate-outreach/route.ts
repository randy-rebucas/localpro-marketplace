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
import { verifyCronSecret } from "@/lib/cronAuth";
import { withHandler } from "@/lib/utils";
import { ValidationError } from "@/lib/errors";

export const POST = withHandler(async (req: NextRequest) => {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return NextResponse.json({ error: "Outreach service not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    userId,
    actionType = "fund_escrow",
    context = {},
  } = body;

  if (!userId) {
    throw new ValidationError("userId is required");
  }

  const userProfile = body.userProfile || {
    role: body.role || "client",
    engagementLevel: body.engagementLevel || "medium",
    lastActiveAt: body.lastActiveAt,
    joinedAt: body.joinedAt,
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${appUrl}/api/ai/agents/outreach-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${internalKey}`,
    },
    body: JSON.stringify({ userId, userProfile, actionType, context }),
  });

  if (!response.ok) {
    console.error("[Outreach Handler] AI agent failed:", response.status);
    return NextResponse.json({ error: "Outreach generation service failed" }, { status: 502 });
  }

  const aiResult = await response.json();
  const outreach = aiResult.outreach;

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
});
