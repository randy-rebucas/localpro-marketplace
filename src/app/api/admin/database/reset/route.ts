/**
 * POST /api/admin/database/reset
 *
 * Body: { action: "full_reset" | "seed_only" | "clear_collection", collection?: string, confirmToken: string }
 *
 * - full_reset:       Clears all app data collections + re-seeds categories, skills, admin user
 * - seed_only:        Inserts missing seed data without wiping existing records
 * - clear_collection: Clears a single named collection
 *
 * Requires confirmToken === process.env.DB_RESET_TOKEN (or falls back to NEXTAUTH_SECRET).
 * Admin-only. Never available in production unless DB_RESET_ENABLED=true.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { UnprocessableError, ForbiddenError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const RESETABLE_COLLECTIONS = [
  "users", "jobs", "quotes", "payments", "payouts", "transactions",
  "reviews", "disputes", "messages", "notifications", "activitylogs",
  "favoriteproviders", "providerprofiles", "categories", "skills",
  "wallets", "wallettransactions", "walletwithdrawals",
  "ledgerentries", "accountbalances", "recurringschedules",
  "loyaltyaccounts", "loyaltytransactions", "consultations",
  "announcements", "knowledgearticles", "businessorganizations",
  "businessmembers", "jobapplications", "livelihoodgroups",
  "pesooffices", "quotetemplates", "appsettings",
];

const DEFAULT_CATEGORIES = [
  { name: "Plumbing",                   icon: "🔧", order: 0 },
  { name: "Electrical",                 icon: "⚡", order: 1 },
  { name: "Cleaning",                   icon: "🧹", order: 2 },
  { name: "Landscaping",                icon: "🌿", order: 3 },
  { name: "Carpentry",                  icon: "🪚", order: 4 },
  { name: "Painting",                   icon: "🎨", order: 5 },
  { name: "Roofing",                    icon: "🏠", order: 6 },
  { name: "HVAC",                       icon: "❄️",  order: 7 },
  { name: "Moving",                     icon: "📦", order: 8 },
  { name: "Handyman",                   icon: "🛠️", order: 9 },
  { name: "Masonry & Tiling",           icon: "🧱", order: 10 },
  { name: "Welding & Fabrication",      icon: "🔩", order: 11 },
  { name: "Automotive & Mechanics",     icon: "🚗", order: 12 },
  { name: "IT & Technology",            icon: "💻", order: 13 },
  { name: "Food & Culinary",            icon: "🍳", order: 14 },
  { name: "Transportation & Logistics", icon: "🚚", order: 15 },
  { name: "Beauty & Personal Care",     icon: "💅", order: 16 },
  { name: "Pet Care & Grooming",        icon: "🐾", order: 17 },
  { name: "Other",                      icon: "📋", order: 18 },
];

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function seedCategories(db: mongoose.mongo.Db): Promise<number> {
  const CategorySchema = new mongoose.Schema({
    name:        { type: String, required: true, unique: true },
    slug:        { type: String, required: true, unique: true },
    icon:        { type: String },
    description: { type: String, default: "" },
    isActive:    { type: Boolean, default: true },
    order:       { type: Number, default: 0 },
  }, { timestamps: true });

  const Category = mongoose.models.Category ?? mongoose.model("Category", CategorySchema);
  let inserted = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    const slug = slugify(cat.name);
    const exists = await Category.findOne({ slug });
    if (!exists) {
      await Category.create({ ...cat, slug, description: "", isActive: true });
      inserted++;
    }
  }
  return inserted;
}

async function seedAdmin(db: mongoose.mongo.Db): Promise<boolean> {
  const email    = process.env.SEED_ADMIN_EMAIL    ?? "admin@localpro.ph";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
  const name     = process.env.SEED_ADMIN_NAME     ?? "Super Admin";

  const UserSchema = new mongoose.Schema({
    name:           String,
    email:          { type: String, unique: true, lowercase: true },
    password:       { type: String, select: false },
    role:           String,
    isVerified:     { type: Boolean, default: false },
    isSuspended:    { type: Boolean, default: false },
    approvalStatus: { type: String, default: "approved" },
    kycStatus:      { type: String, default: "none" },
  }, { timestamps: true });

  const User = mongoose.models.User ?? mongoose.model("User", UserSchema);
  const exists = await User.findOne({ email });
  if (exists) return false;

  const hashed = await bcrypt.hash(password, 12);
  await User.create({ name, email, password: hashed, role: "admin", isVerified: true, approvalStatus: "approved" });
  return true;
}

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  // Guard: must be explicitly enabled
  if (process.env.DB_RESET_ENABLED !== "true") {
    throw new ForbiddenError(
      "Database reset is disabled. Set DB_RESET_ENABLED=true in your environment to enable it."
    );
  }

  const body = await req.json() as {
    action: "full_reset" | "seed_only" | "clear_collection";
    collection?: string;
    confirmToken: string;
  };

  const expectedToken = process.env.DB_RESET_TOKEN ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!expectedToken || body.confirmToken !== expectedToken) {
    throw new ForbiddenError("Invalid confirmation token.");
  }

  if (!["full_reset", "seed_only", "clear_collection"].includes(body.action)) {
    throw new UnprocessableError("Invalid action.");
  }

  await connectDB();
  const db = mongoose.connection.db!;
  const existingColls = new Set((await db.listCollections().toArray()).map((c) => c.name));

  const log: string[] = [];

  if (body.action === "clear_collection") {
    const col = body.collection?.toLowerCase();
    if (!col || !RESETABLE_COLLECTIONS.includes(col)) {
      throw new UnprocessableError(`Collection "${col}" is not in the allowed list.`);
    }
    if (existingColls.has(col)) {
      const result = await db.collection(col).deleteMany({});
      log.push(`Cleared ${col}: ${result.deletedCount} documents removed.`);
    } else {
      log.push(`Collection "${col}" does not exist — nothing to clear.`);
    }
    return NextResponse.json({ success: true, log });
  }

  if (body.action === "full_reset") {
    for (const name of RESETABLE_COLLECTIONS) {
      if (existingColls.has(name)) {
        const result = await db.collection(name).deleteMany({});
        log.push(`Cleared ${name}: ${result.deletedCount} docs`);
      }
    }
  }

  // Seed (both full_reset and seed_only)
  const catInserted = await seedCategories(db);
  log.push(`Categories: ${catInserted} seeded`);

  const adminCreated = await seedAdmin(db);
  log.push(adminCreated ? "Admin user created" : "Admin user already exists — skipped");

  return NextResponse.json({ success: true, log });
});
