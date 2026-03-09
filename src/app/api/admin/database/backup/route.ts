/**
 * GET /api/admin/database/backup
 * Exports all tracked collections as a single JSON file.
 * - Writes the file to <project_root>/backup/ on the server.
 * - Also streams it as a browser download.
 * Admin-only.
 *
 * Query params:
 *   ?collections=users,jobs,...  — optional comma-separated list (defaults to all)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const ALL_COLLECTIONS = [
  "users", "jobs", "quotes", "transactions", "payments", "payouts",
  "reviews", "disputes", "messages", "notifications", "activitylogs",
  "providerprofiles", "categories", "skills", "wallets",
  "wallettransactions", "walletwithdrawals", "ledgerentries",
  "accountbalances", "announcements", "knowledgearticles",
  "loyaltyaccounts", "recurringschedules", "businessorganizations",
  "businessmembers", "consultations", "appsettings", "pesooffices",
];

export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("collections");
  const selected = requested
    ? requested.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : ALL_COLLECTIONS;

  await connectDB();
  const db = mongoose.connection.db!;
  const existingColls = new Set((await db.listCollections().toArray()).map((c) => c.name));

  const backup: Record<string, unknown[]> = {
    __meta: [{
      exportedAt: new Date().toISOString(),
      dbName: db.databaseName,
      collections: selected,
      version: "1.0",
    }] as unknown as unknown[],
  };

  for (const name of selected) {
    if (existingColls.has(name)) {
      backup[name] = await db.collection(name).find({}).toArray();
    } else {
      backup[name] = [];
    }
  }

  const json = JSON.stringify(backup, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `localpro-backup-${timestamp}.json`;

  // ── Write to backup/ directory in codebase ─────────────────────────────
  const backupDir = path.join(process.cwd(), "backup");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const savedPath = path.join(backupDir, filename);
  fs.writeFileSync(savedPath, json, "utf8");

  // ── Also return as browser download ────────────────────────────────────
  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": Buffer.byteLength(json, "utf8").toString(),
      "X-Backup-Path": `backup/${filename}`,
    },
  });
});
