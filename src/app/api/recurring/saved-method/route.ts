import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/**
 * GET /api/recurring/saved-method
 * Returns the logged-in client's saved card info (last4, brand) if any.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`saved-method:${user.userId}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const doc = await User.findById(user.userId)
    .select("savedPaymentMethodId savedPaymentMethodLast4 savedPaymentMethodBrand")
    .lean() as {
      savedPaymentMethodId?: string | null;
      savedPaymentMethodLast4?: string | null;
      savedPaymentMethodBrand?: string | null;
    } | null;

  if (!doc?.savedPaymentMethodId) {
    return NextResponse.json({ savedMethod: null });
  }

  return NextResponse.json({
    savedMethod: {
      last4: doc.savedPaymentMethodLast4,
      brand: doc.savedPaymentMethodBrand,
    },
  });
});

/**
 * DELETE /api/recurring/saved-method
 * Removes the client's stored card payment method.
 */
export const DELETE = withHandler(async (req: NextRequest) => {
  const user = await requireUser();

  const rl = await checkRateLimit(`saved-method-del:${user.userId}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  await User.findByIdAndUpdate(user.userId, {
    $unset: {
      savedPaymentMethodId: 1,
      savedPaymentMethodLast4: 1,
      savedPaymentMethodBrand: 1,
    },
  });

  return NextResponse.json({ ok: true });
});
