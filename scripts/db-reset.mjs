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
  // Home & Building
  { name: "Plumbing",                   icon: "🔧", description: "Pipe installation, leak repairs, drain cleaning, and water system maintenance.", order: 0 },
  { name: "Electrical",                 icon: "⚡", description: "Wiring, panel upgrades, outlet installation, and electrical troubleshooting.", order: 1 },
  { name: "Cleaning",                   icon: "🧹", description: "Residential and commercial cleaning including deep cleaning, housekeeping, and janitorial services.", order: 2 },
  { name: "Landscaping",                icon: "🌿", description: "Lawn care, garden design, tree trimming, and outdoor maintenance.", order: 3 },
  { name: "Carpentry",                  icon: "🪚", description: "Custom furniture, cabinetry, framing, and wood repairs.", order: 4 },
  { name: "Painting",                   icon: "🎨", description: "Interior and exterior painting, finishing, and surface preparation.", order: 5 },
  { name: "Roofing",                    icon: "🏠", description: "Roof installation, repair, inspection, and waterproofing.", order: 6 },
  { name: "HVAC",                       icon: "❄️",  description: "Heating, ventilation, and air conditioning installation, repair, and maintenance.", order: 7 },
  { name: "Moving",                     icon: "📦", description: "Residential and commercial moving, packing, and transport services.", order: 8 },
  { name: "Handyman",                   icon: "🛠️", description: "General home repairs, assembly, minor fixes, and maintenance tasks.", order: 9 },
  { name: "Masonry & Tiling",           icon: "🧱", description: "Brickwork, concrete, tile setting, stone masonry, and rebar work.", order: 10 },
  { name: "Welding & Fabrication",      icon: "🔩", description: "Metal welding, cutting, sheet metal work, and structural fabrication.", order: 11 },

  // Mechanical & Automotive
  { name: "Automotive & Mechanics",     icon: "🚗", description: "Car repair, diagnostics, diesel mechanics, and vehicle maintenance.", order: 12 },
  { name: "Mechanical & Industrial",    icon: "⚙️", description: "Machinery repair, CNC operation, millwright work, and industrial equipment maintenance.", order: 13 },

  // Technology
  { name: "IT & Technology",            icon: "💻", description: "Computer repair, network setup, IT support, and software troubleshooting.", order: 14 },
  { name: "Electronics & Telecom",      icon: "📡", description: "Electronics repair, telecoms installation, and line maintenance.", order: 15 },

  // Food & Service
  { name: "Food & Culinary",            icon: "🍳", description: "Cooking, catering, baking, pastry, and food preparation services.", order: 16 },
  { name: "Tailoring & Fashion",        icon: "🪡", description: "Clothing alterations, custom tailoring, dressmaking, and fabric work.", order: 17 },

  // Transportation
  { name: "Transportation & Logistics", icon: "🚚", description: "Freight driving, delivery, crane and forklift operation, and logistics services.", order: 18 },

  // Health & Safety
  { name: "Health & Medical",           icon: "🏥", description: "Paramedic, medical lab, dental, and pharmacy technician services.", order: 19 },
  { name: "Safety & Security",          icon: "🦺", description: "Firefighting, security system installation, and safety compliance services.", order: 20 },

  // Beauty & Personal Care
  { name: "Beauty & Personal Care",     icon: "💅", description: "Hair styling, makeup, nail care, massage therapy, and esthetic treatments.", order: 21 },

  // Pet
  { name: "Pet Care & Grooming",        icon: "🐾", description: "Pet grooming, bathing, trimming, and animal care services.", order: 22 },

  { name: "Other",                      icon: "📋", description: "Services that do not fit into any other category.", order: 23 },
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
  name:        { type: String, required: true, unique: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  icon:        { type: String, default: "🔧" },
  description: { type: String, default: "" },
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
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
