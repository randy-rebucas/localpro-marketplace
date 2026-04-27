/**
 * POST /api/admin/database/restore
 * Restores collections from a backup JSON file produced by the backup endpoint.
 *
 * Body (multipart/form-data):
 *   file      — the backup .json file
 *   mode      — "upsert" (default) | "replace"
 *               upsert: merges into existing docs using _id; replace: drops collection first
 *   confirmToken — must match DB_RESET_TOKEN
 *
 * Requires DB_RESET_ENABLED=true.
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { ForbiddenError, UnprocessableError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

import { checkRateLimit } from "@/lib/rateLimit";
const ALLOWED_COLLECTIONS = new Set([
  "users", "jobs", "quotes", "transactions", "payments", "payouts",
  "reviews", "disputes", "messages", "notifications", "activitylogs",
  "providerprofiles", "categories", "skills", "wallets",
  "wallettransactions", "walletwithdrawals", "ledgerentries",
  "accountbalances", "announcements", "knowledgearticles",
  "loyaltyaccounts", "loyaltytransactions", "recurringschedules",
  "businessorganizations", "businessmembers", "consultations",
  "appsettings", "pesooffices", "favoriteproviders",
  "jobapplications", "livelihoodgroups", "quotetemplates",
]);

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (process.env.DB_RESET_ENABLED !== "true") {
    throw new ForbiddenError("Database restore is disabled. Set DB_RESET_ENABLED=true to enable.");
  }

  const formData = await req.formData();
  const file        = formData.get("file") as File | null;
  const mode        = (formData.get("mode") as string | null) ?? "upsert";
  const confirmToken = formData.get("confirmToken") as string | null;

  const expectedToken = process.env.DB_RESET_TOKEN ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!expectedToken || confirmToken !== expectedToken) {
    throw new ForbiddenError("Invalid confirmation token.");
  }

  if (!file) throw new UnprocessableError("No backup file provided.");
  if (!["upsert", "replace"].includes(mode)) throw new UnprocessableError("Invalid mode.");

  const text = await file.text();
  let backup: Record<string, unknown[]>;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new UnprocessableError("Invalid JSON file.");
  }

  if (!backup || typeof backup !== "object") {
    throw new UnprocessableError("Backup file has an unexpected format.");
  }

  await connectDB();
  const db = mongoose.connection.db!;
  const log: string[] = [];
  const meta = backup.__meta as Array<{ exportedAt?: string; version?: string }> | undefined;
  if (meta?.[0]?.exportedAt) log.push(`Backup exported: ${meta[0].exportedAt}`);

  // Collect work items so we can validate before touching the DB
  const workItems: Array<{ collName: string; docs: unknown[] }> = [];
  for (const [collName, docs] of Object.entries(backup)) {
    if (collName === "__meta") continue;
    if (!ALLOWED_COLLECTIONS.has(collName)) {
      log.push(`Skipped "${collName}" — not in allowed list`);
      continue;
    }
    if (!Array.isArray(docs) || docs.length === 0) {
      log.push(`Skipped "${collName}" — empty`);
      continue;
    }
    workItems.push({ collName, docs });
  }

  // Execute all writes inside a single MongoDB client session for atomicity.
  // If any collection write fails, the session aborts and the DB is left intact.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const { collName, docs } of workItems) {
        const coll = db.collection(collName);

        if (mode === "replace") {
          await coll.deleteMany({}, { session });
          await coll.insertMany(
            docs as mongoose.mongo.OptionalId<mongoose.mongo.Document>[],
            { session }
          );
          log.push(`Replaced "${collName}": ${docs.length} documents`);
        } else {
          // upsert mode: insertOrReplace by _id
          let upserted = 0;
          for (const doc of docs as Array<{ _id?: unknown }>) {
            if (!doc._id) continue;
            await coll.replaceOne(
              { _id: doc._id },
              doc as mongoose.mongo.Document,
              { upsert: true, session }
            );
            upserted++;
          }
          log.push(`Upserted "${collName}": ${upserted} documents`);
        }
      }
    });
  } finally {
    await session.endSession();
  }

  return NextResponse.json({ success: true, log });
});
