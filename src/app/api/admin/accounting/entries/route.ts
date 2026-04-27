/**
 * GET /api/admin/accounting/entries
 *
 * Returns paginated ledger journals (grouped by journalId), newest first.
 * Each journal contains all its debit/credit lines.
 *
 * Query params:
 *   page    — 1-based page number (default: 1)
 *   limit   — journals per page (default: 20, max: 50)
 *   type    — filter by entryType
 *   entity  — filter by entityType
 */

import { NextRequest, NextResponse } from "next/server";
import type { PipelineStage } from "mongoose";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import LedgerEntry from "@/models/LedgerEntry";

import { checkRateLimit } from "@/lib/rateLimit";
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  await connectDB();

  const { searchParams } = req.nextUrl;
  const page    = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit   = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const typeRaw   = searchParams.get("type")   ?? "";
  const entityRaw = searchParams.get("entity") ?? "";

  // Allowlists guard against NoSQL injection via aggregation $match
  const VALID_ENTRY_TYPES = new Set([
    "escrow_funded", "escrow_released", "platform_commission", "provider_payout",
    "wallet_deposit", "wallet_withdrawal", "wallet_escrow", "wallet_escrow_release",
    "dispute_refund", "dispute_platform", "admin_credit", "admin_debit",
  ]);
  const VALID_ENTITY_TYPES = new Set([
    "job", "payout", "payment", "wallet_withdrawal",
    "dispute", "transaction", "recurring_schedule", "manual",
  ]);

  const type   = VALID_ENTRY_TYPES.has(typeRaw)   ? typeRaw   : "";
  const entity = VALID_ENTITY_TYPES.has(entityRaw) ? entityRaw : "";

  // Build match for individual entries
  const match: Record<string, string> = {};
  if (type)   match.entryType   = type;
  if (entity) match.entityType  = entity;

  // Aggregate: group by journalId, sort journals newest-first, paginate
  const pipeline: PipelineStage[] = [
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$journalId",
        journalId:   { $first: "$journalId" },
        entryType:   { $first: "$entryType" },
        entityType:  { $first: "$entityType" },
        entityId:    { $first: "$entityId" },
        description: { $first: "$description" },
        currency:    { $first: "$currency" },
        createdAt:   { $first: "$createdAt" },
        totalAmount: { $sum: "$amountCentavos" },        // sum of all debits in journal
        lineCount:   { $sum: 1 },
        lines: {
          $push: {
            _id:           "$_id",
            debitAccount:  "$debitAccount",
            creditAccount: "$creditAccount",
            amountCentavos: "$amountCentavos",
            description:   "$description",
            createdAt:     "$createdAt",
          },
        },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data:  [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await LedgerEntry.aggregate(pipeline);
  const journals = result?.data ?? [];
  const total    = result?.total?.[0]?.count ?? 0;

  return NextResponse.json({
    journals,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});
