/**
 * POST /api/admin/accounting/manual-entry
 *
 * Creates an arbitrary double-entry journal in the ledger. Intended for admin
 * corrections, write-offs, goodwill credits, and any event that doesn't have
 * an automated flow.
 *
 * Body:
 *   debitAccount   — AccountCode (e.g. "1000", "2100")
 *   creditAccount  — AccountCode (e.g. "2200", "4000")
 *   amountPHP      — positive number (will be rounded to centavos)
 *   description    — human-readable note (required)
 *   reason         — audit rationale stored in metadata (required)
 *   entityId       — optional MongoDB ObjectId string to reference (uses a generated ID if omitted)
 *   entityType     — optional entity type (default: "manual")
 *   clientId       — optional user to associate as client party
 *   providerId     — optional user to associate as provider party
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import { assertObjectId } from "@/lib/errors";
import { ledgerRepository } from "@/repositories/ledger.repository";
import { activityRepository } from "@/repositories";
import { ACCOUNT_CODES } from "@/models/LedgerEntry";
import type { AccountCode, LedgerEntityType } from "@/models/LedgerEntry";

const VALID_ACCOUNT_CODES = Object.values(ACCOUNT_CODES) as AccountCode[];

const ENTITY_TYPES: LedgerEntityType[] = [
  "job", "payout", "payment", "wallet_withdrawal",
  "dispute", "transaction", "recurring_schedule", "manual",
];

const Schema = z.object({
  debitAccount:  z.enum(VALID_ACCOUNT_CODES as [AccountCode, ...AccountCode[]]),
  creditAccount: z.enum(VALID_ACCOUNT_CODES as [AccountCode, ...AccountCode[]]),
  amountPHP:     z.number().positive("Amount must be positive"),
  description:   z.string().min(5, "Description required (min 5 chars)").max(300),
  reason:        z.string().min(5, "Reason required (min 5 chars)").max(500),
  entityId:      z.string().optional(),
  entityType:    z.enum(ENTITY_TYPES as [LedgerEntityType, ...LedgerEntityType[]]).optional(),
  clientId:      z.string().optional(),
  providerId:    z.string().optional(),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const {
    debitAccount,
    creditAccount,
    amountPHP,
    description,
    reason,
    entityType = "manual",
    clientId,
    providerId,
  } = parsed.data;

  // Validate optional ID strings before using them as ObjectIds
  if (clientId)   assertObjectId(clientId,   "clientId");
  if (providerId) assertObjectId(providerId, "providerId");

  const entityId = parsed.data.entityId ?? new mongoose.Types.ObjectId().toString();
  if (parsed.data.entityId) assertObjectId(entityId, "entityId");

  if (debitAccount === creditAccount) {
    return NextResponse.json({ error: "Debit and credit accounts must differ" }, { status: 400 });
  }

  await connectDB();

  const amountCentavos = Math.round(amountPHP * 100);
  const journalId      = `manual-${Date.now()}-${entityId}`;

  await ledgerRepository.postJournal([{
    journalId,
    entryType:     "admin_credit" as const, // manual entries tagged admin_credit
    debitAccount:  debitAccount  as AccountCode,
    creditAccount: creditAccount as AccountCode,
    amountCentavos,
    currency: "PHP",
    entityType: entityType as LedgerEntityType,
    entityId:  new mongoose.Types.ObjectId(entityId),
    clientId:   clientId   ? new mongoose.Types.ObjectId(clientId)   : null,
    providerId: providerId ? new mongoose.Types.ObjectId(providerId) : null,
    initiatedBy: new mongoose.Types.ObjectId(user.userId),
    description,
    reversedBy: null,
    reversalOf: null,
    metadata: { reason, adminId: user.userId, manualEntry: true },
  }]);

  await activityRepository.log({
    userId: user.userId,
    eventType: "admin_ledger_entry",
    metadata: {
      journalId,
      debitAccount,
      creditAccount,
      amountPHP,
      description,
      reason,
    },
  });

  return NextResponse.json({ success: true, journalId, amountCentavos });
});
