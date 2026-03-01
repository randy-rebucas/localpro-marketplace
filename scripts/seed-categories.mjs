/**
 * Category Seed Script
 * --------------------
 * Upserts all DEFAULT_CATEGORIES into the database.
 * Safe to re-run — existing categories are updated in-place; missing ones are inserted.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-categories.mjs
 *
 * Optional flags:
 *   --wipe   Drop all categories first, then re-insert from scratch
 */

import mongoose from "mongoose";

// ─── Parse CLI flags ──────────────────────────────────────────────────────────
const WIPE = process.argv.includes("--wipe");

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed-categories.mjs");
  process.exit(1);
}

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
  { name: "HVAC",                       icon: "❄️", description: "Heating, ventilation, and air conditioning installation, repair, and maintenance.", order: 7 },
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

// ─── Minimal schema (avoids importing TS source) ─────────────────────────────
const CategorySchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true },
    icon:        { type: String, default: "🔧" },
    description: { type: String, default: "" },
    isActive:    { type: Boolean, default: true },
    order:       { type: Number, default: 0 },
  },
  { timestamps: true }
);

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function ok(msg)   { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔌  Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log(`✅  Connected: ${mongoose.connection.name}\n`);

  const Category = mongoose.models.Category ?? mongoose.model("Category", CategorySchema);

  if (WIPE) {
    console.log("🗑️   --wipe: clearing categories collection…");
    await Category.deleteMany({});
    warn("All categories removed.");
    console.log();
  }

  console.log("📂  Seeding categories…");
  let inserted = 0;
  let updated  = 0;

  for (const cat of DEFAULT_CATEGORIES) {
    const slug = slugify(cat.name);
    const result = await Category.findOneAndUpdate(
      { slug },
      { $set: { ...cat, slug, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt?.getTime() === result.updatedAt?.getTime()) {
      inserted++;
    } else {
      updated++;
    }
  }

  ok(`Inserted: ${inserted}  |  Updated: ${updated}  |  Total: ${DEFAULT_CATEGORIES.length}`);

  // Deactivate any category not in the seed list (orphaned)
  const seedSlugs = DEFAULT_CATEGORIES.map((c) => slugify(c.name));
  const deactivated = await Category.updateMany(
    { slug: { $nin: seedSlugs } },
    { $set: { isActive: false } }
  );
  if (deactivated.modifiedCount > 0) {
    warn(`Deactivated ${deactivated.modifiedCount} orphaned category/categories not in seed list.`);
  }

  console.log();
  await mongoose.disconnect();
  console.log("✅  Category seed complete.\n");
}

main().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  process.exit(1);
});
