/**
 * GET /api/admin/database/stats
 * Returns per-collection document counts and DB storage stats.
 * Admin-only.
 */

import { NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

const TRACKED_COLLECTIONS = [
  { name: "users",               label: "Users" },
  { name: "jobs",                label: "Jobs" },
  { name: "quotes",              label: "Quotes" },
  { name: "transactions",        label: "Transactions" },
  { name: "payments",            label: "Payments" },
  { name: "payouts",             label: "Payouts" },
  { name: "reviews",             label: "Reviews" },
  { name: "disputes",            label: "Disputes" },
  { name: "messages",            label: "Messages" },
  { name: "notifications",       label: "Notifications" },
  { name: "activitylogs",        label: "Activity Logs" },
  { name: "providerprofiles",    label: "Provider Profiles" },
  { name: "categories",          label: "Categories" },
  { name: "skills",              label: "Skills" },
  { name: "wallets",             label: "Wallets" },
  { name: "wallettransactions",  label: "Wallet Transactions" },
  { name: "walletwithdrawals",   label: "Wallet Withdrawals" },
  { name: "ledgerentries",       label: "Ledger Entries" },
  { name: "accountbalances",     label: "Account Balances" },
  { name: "announcements",         label: "Announcements" },
  { name: "knowledgearticles",     label: "Knowledge Articles" },
  { name: "loyaltyaccounts",       label: "Loyalty Accounts" },
  { name: "loyaltytransactions",   label: "Loyalty Transactions" },
  { name: "recurringschedules",    label: "Recurring Schedules" },
  { name: "businessorganizations", label: "Business Orgs" },
  { name: "businessmembers",       label: "Business Members" },
  { name: "consultations",         label: "Consultations" },
  { name: "favoriteproviders",     label: "Favorite Providers" },
  { name: "jobapplications",       label: "Job Applications" },
  { name: "livelihoodgroups",      label: "Livelihood Groups" },
  { name: "pesooffices",           label: "PESO Offices" },
  { name: "quotetemplates",        label: "Quote Templates" },
  { name: "appsettings",           label: "App Settings" },
];

export const GET = withHandler(async () => {
  const user = await requireUser();
  requireRole(user, "admin");

  await connectDB();
  const db = mongoose.connection.db!;

  const existingColls = new Set(
    (await db.listCollections().toArray()).map((c) => c.name)
  );

  const counts = await Promise.all(
    TRACKED_COLLECTIONS.map(async ({ name, label }) => {
      if (!existingColls.has(name)) return { name, label, count: 0, exists: false };
      const count = await db.collection(name).countDocuments();
      return { name, label, count, exists: true };
    })
  );

  // DB stats
  const dbStats = await db.stats();

  return NextResponse.json({
    collections: counts,
    dbName: db.databaseName,
    storageSize: dbStats.storageSize ?? 0,
    dataSize: dbStats.dataSize ?? 0,
    indexSize: dbStats.indexSize ?? 0,
    totalCollections: existingColls.size,
  });
});
