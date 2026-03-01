/**
 * DB Reset Script
 * ---------------
 * Drops all application collections and re-seeds:
 *   - Categories (from DEFAULT_CATEGORIES)
 *   - Skills     (from SKILL_SEEDS)
 *   - One default admin account
 *
 * Usage:
 *   node --env-file=.env.local scripts/db-reset.mjs
 *
 * Optional flags (add after the script path):
 *   --seed-only   Skip dropping collections; only insert missing seed data
 *   --no-admin    Skip creating the default admin user
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ─── Parse CLI flags ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const SEED_ONLY  = args.includes("--seed-only");
const NO_ADMIN   = args.includes("--no-admin");

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/db-reset.mjs");
  process.exit(1);
}

const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? "admin@localpro.ph";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     ?? "Super Admin";

// ─── Collections to wipe ─────────────────────────────────────────────────────
const COLLECTIONS = [
  "users",
  "jobs",
  "quotes",
  "payments",
  "payouts",
  "transactions",
  "reviews",
  "disputes",
  "messages",
  "notifications",
  "activitylogs",
  "favoriteProviders",
  "providerprofiles",
  "categories",
  "skills",
];

// ─── Seed data ────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: "Plumbing",     icon: "🔧", order: 0 },
  { name: "Electrical",   icon: "⚡", order: 1 },
  { name: "Cleaning",     icon: "🧹", order: 2 },
  { name: "Landscaping",  icon: "🌿", order: 3 },
  { name: "Carpentry",    icon: "🪚", order: 4 },
  { name: "Painting",     icon: "🎨", order: 5 },
  { name: "Roofing",      icon: "🏠", order: 6 },
  { name: "HVAC",         icon: "❄️",  order: 7 },
  { name: "Moving",       icon: "📦", order: 8 },
  { name: "Handyman",     icon: "🛠️", order: 9 },
  { name: "Other",        icon: "📋", order: 10 },
];

const SKILL_SEEDS = [
  "Plumbing","Electrical","Carpentry","Painting","Welding","Masonry","Tiling",
  "Roofing","HVAC","Air Conditioning Repair","Refrigerator Repair",
  "Washing Machine Repair","TV Repair","Appliance Repair","Computer Repair",
  "Phone Repair","Landscaping","Lawn Care","Tree Trimming","Pest Control",
  "Cleaning","Deep Cleaning","Window Cleaning","Laundry","Ironing","Cooking",
  "Catering","Babysitting","Elderly Care","Pet Care","Dog Walking","Tutoring",
  "Photography","Videography","Graphic Design","Web Design","Data Entry",
  "Accounting","Driving","Delivery","Moving","Hauling","Auto Repair",
  "Motorcycle Repair","Car Wash","Security","Event Planning","Tailoring",
  "Shoe Repair",
];

// ─── Minimal schemas (avoid importing TS source) ──────────────────────────────
const CategorySchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true, trim: true },
  slug:     { type: String, required: true, unique: true, lowercase: true },
  icon:     { type: String, default: "🔧" },
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
}, { timestamps: true });

const SkillSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  label:      { type: String, required: true, trim: true },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  email:          { type: String, required: true, unique: true, lowercase: true },
  password:       { type: String, select: false },
  role:           { type: String, enum: ["client","provider","admin"], required: true },
  isVerified:     { type: Boolean, default: false },
  isSuspended:    { type: Boolean, default: false },
  approvalStatus: { type: String, default: "approved" },
  kycStatus:      { type: String, default: "none" },
}, { timestamps: true });

function getModel(name, schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function log(msg)  { console.log(`  ${msg}`); }
function ok(msg)   { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔌  Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log(`✅  Connected: ${mongoose.connection.name}\n`);

  // ── 1. Drop collections ──────────────────────────────────────────────────
  if (!SEED_ONLY) {
    console.log("🗑️   Dropping collections…");
    const db = mongoose.connection.db;
    const existingColls = new Set(
      (await db.listCollections().toArray()).map((c) => c.name)
    );
    for (const name of COLLECTIONS) {
      if (existingColls.has(name)) {
        await db.collection(name).deleteMany({});
        log(`Cleared: ${name}`);
      } else {
        warn(`Skipped (not found): ${name}`);
      }
    }
    console.log();
  } else {
    console.log("⏩  --seed-only: skipping collection wipe\n");
  }

  // ── 2. Seed categories ───────────────────────────────────────────────────
  console.log("📂  Seeding categories…");
  const Category = getModel("Category", CategorySchema);
  let catInserted = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    const slug = slugify(cat.name);
    const exists = await Category.findOne({ slug });
    if (!exists) {
      await Category.create({ ...cat, slug, isActive: true });
      catInserted++;
    }
  }
  ok(`Categories: ${catInserted} inserted, ${DEFAULT_CATEGORIES.length - catInserted} already existed`);
  console.log();

  // ── 3. Seed skills ───────────────────────────────────────────────────────
  console.log("🛠️   Seeding skills…");
  const Skill = getModel("Skill", SkillSchema);
  let skillInserted = 0;
  for (const label of SKILL_SEEDS) {
    const name = label.toLowerCase().trim();
    const exists = await Skill.findOne({ name });
    if (!exists) {
      await Skill.create({ name, label, usageCount: 0 });
      skillInserted++;
    }
  }
  ok(`Skills: ${skillInserted} inserted, ${SKILL_SEEDS.length - skillInserted} already existed`);
  console.log();

  // ── 4. Seed admin user ───────────────────────────────────────────────────
  if (!NO_ADMIN) {
    console.log("👤  Seeding admin account…");
    const User = getModel("User", UserSchema);
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      warn(`Admin already exists: ${ADMIN_EMAIL} (skipped)`);
    } else {
      const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await User.create({
        name:           ADMIN_NAME,
        email:          ADMIN_EMAIL,
        password:       hashed,
        role:           "admin",
        isVerified:     true,
        isSuspended:    false,
        approvalStatus: "approved",
        kycStatus:      "none",
      });
      ok(`Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    }
    console.log();
  }

  await mongoose.disconnect();
  console.log("✅  Done. Database is ready.\n");
}

main().catch((err) => {
  console.error("\n❌  Reset failed:", err.message);
  process.exit(1);
});
