import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireRole } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { notificationService } from "@/services";
import { sendEmail, baseMarketingTemplate } from "@/lib/email";
import { sendSms } from "@/lib/twilio";
import { generateUnsubscribeUrl } from "@/lib/unsubscribe";

import { checkRateLimit } from "@/lib/rateLimit";
const CHANNELS = ["email", "sms", "in_app"] as const;

const BulkMessageSchema = z.object({
  ids:      z.array(z.string().min(1)).min(1).max(200),
  subject:  z.string().min(2).max(200),
  body:     z.string().min(2).max(2000),
  channels: z.array(z.enum(CHANNELS)).min(1),
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireUser();
  requireRole(admin, "admin", "staff");
  const rl = await checkRateLimit(`admin:${admin.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = BulkMessageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { ids, subject, body, channels } = parsed.data;

  const users = await userRepository.find({ _id: { $in: ids } } as never);

  const results = await Promise.allSettled(
    users.map(async (target) => {
      const tid = target._id!.toString();
      let dispatched = 0;

      if (channels.includes("in_app")) {
        await notificationService.push({
          userId:  tid,
          type:    "admin_message",
          title:   subject,
          message: body,
        });
        dispatched++;
      }

      if (channels.includes("email") && target.email) {
        const unsubUrl = generateUnsubscribeUrl(tid);
        const html = baseMarketingTemplate(subject, target.name, body, unsubUrl);
        await sendEmail(target.email, subject, html, tid);
        dispatched++;
      }

      if (channels.includes("sms") && target.phone) {
        await sendSms(target.phone, `[LocalPro] ${subject}\n\n${body}`);
        dispatched++;
      }

      return dispatched;
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value > 0).length;

  return NextResponse.json({ ok: true, sent, total: users.length });
});
