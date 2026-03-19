import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole, requireCapability } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { notificationService } from "@/services";
import { sendEmail, baseMarketingTemplate } from "@/lib/email";
import { sendSms } from "@/lib/twilio";
import { generateUnsubscribeUrl } from "@/lib/unsubscribe";

const CHANNELS = ["email", "sms", "in_app"] as const;

const MessageSchema = z.object({
  subject: z.string().min(2).max(200),
  body:    z.string().min(2).max(2000),
  channels: z.array(z.enum(CHANNELS)).min(1),
});

export const POST = withHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const admin = await requireUser();
  requireRole(admin, "admin", "staff");
  requireCapability(admin, "manage_support");

  const { id } = await params;
  const payload = MessageSchema.safeParse(await req.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.errors[0].message }, { status: 400 });
  }

  const target = await userRepository.findById(id);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { subject, body, channels } = payload.data;
  const results: Record<string, "sent" | "skipped" | "error"> = {};

  // ── Email ────────────────────────────────────────────────────────────────
  if (channels.includes("email")) {
    if (target.email) {
      const unsubUrl = generateUnsubscribeUrl(id);
      const html = baseMarketingTemplate(subject, target.name, body, unsubUrl);
      await sendEmail(target.email, subject, html, id);
      results.email = "sent";
    } else {
      results.email = "skipped"; // no email on record
    }
  }

  // ── SMS ──────────────────────────────────────────────────────────────────
  if (channels.includes("sms")) {
    if (target.phone) {
      await sendSms(target.phone, `[LocalPro] ${subject}\n\n${body}`);
      results.sms = "sent";
    } else {
      results.sms = "skipped"; // user has no phone number
    }
  }

  // ── In-app notification ──────────────────────────────────────────────────
  if (channels.includes("in_app")) {
    await notificationService.push({
      userId:  id,
      type:    "admin_message",
      title:   subject,
      message: body,
    });
    results.in_app = "sent";
  }

  return NextResponse.json({ ok: true, results });
});
