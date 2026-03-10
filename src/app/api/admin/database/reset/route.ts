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

const DEFAULT_SETTINGS = [
  { key: "platform.maintenanceMode",       value: false,  description: "When true, all job posting and registration endpoints return 503." },
  { key: "platform.newRegistrations",      value: true,   description: "When false, new user registrations are blocked." },
  { key: "platform.kycRequired",           value: false,  description: "When true, clients must have kycStatus='approved' before posting jobs." },
  { key: "payments.baseCommissionRate",    value: 15,     description: "Platform commission for standard job categories (whole number %)." },
  { key: "payments.highCommissionRate",    value: 20,     description: "Platform commission for high-value categories (whole number %)." },
  { key: "payments.minJobBudget",          value: 500,    description: "Minimum allowed job budget in PHP." },
  { key: "payments.minPayoutAmount",       value: 100,    description: "Minimum payout or wallet withdrawal amount in PHP." },
  { key: "limits.maxQuotesPerJob",         value: 5,      description: "Maximum provider quotes allowed per job." },
  { key: "limits.quoteValidityDays",       value: 7,      description: "Days before a submitted quote auto-expires." },
  { key: "limits.maxActiveJobsPerClient",  value: 10,     description: "Maximum concurrent active jobs per client." },
];

const AppSettingSchema = new mongoose.Schema(
  {
    key:         { type: String, required: true, unique: true, trim: true },
    value:       { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    updatedBy:   { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

const SKILL_SEEDS: string[] = [
  // Plumbing
  "Plumbing", "Pipe Installation", "Leak Repair", "Drain Cleaning",
  "Water Heater Installation", "Toilet Repair", "Faucet Repair",
  "Sewer Line Repair", "Water Pressure Fix",
  // Electrical
  "Electrical", "Wiring Installation", "Circuit Breaker Repair",
  "Outlet Installation", "Lighting Installation", "Electrical Troubleshooting",
  "Panel Upgrade", "Generator Installation", "CCTV Installation", "Solar Panel Installation",
  // Cleaning
  "Cleaning", "Deep Cleaning", "Window Cleaning", "Carpet Cleaning",
  "Upholstery Cleaning", "Post-Construction Cleaning", "Office Cleaning",
  "Laundry", "Ironing", "Housekeeping", "Disinfection & Sanitation",
  // Landscaping
  "Landscaping", "Lawn Care", "Tree Trimming", "Garden Design",
  "Irrigation Installation", "Soil & Fertilization", "Pest Control", "Pressure Washing",
  // Carpentry
  "Carpentry", "Furniture Making", "Cabinet Installation", "Door & Window Framing",
  "Deck Building", "Wood Repair", "Flooring Installation", "Hardwood Flooring", "Laminate Flooring",
  // Painting
  "Painting", "Interior Painting", "Exterior Painting", "Wallpaper Installation",
  "Epoxy Floor Coating", "Surface Preparation", "Texture Painting",
  // Roofing
  "Roofing", "Roof Installation", "Roof Repair", "Waterproofing",
  "Roof Inspection", "Gutters & Drainage", "Metal Roofing",
  // HVAC
  "HVAC", "Air Conditioning Repair", "Air Conditioning Installation",
  "Refrigerator Repair", "Ventilation System Repair", "Duct Cleaning", "Heating System Repair",
  // Moving
  "Moving", "Packing & Unpacking", "Furniture Assembly", "Hauling", "Storage Solutions",
  // Handyman
  "Handyman", "General Repairs", "Appliance Installation", "TV Mounting",
  "Shelving & Storage", "Door Lock Installation", "Caulking & Sealing",
  // Masonry & Tiling
  "Masonry", "Tiling", "Tile Setting", "Brickwork", "Concrete Work",
  "Stone Masonry", "Plastering", "Rebar & Steelwork",
  // Welding & Fabrication
  "Welding", "Metal Fabrication", "Sheet Metal Work", "Steel Cutting",
  "Gate & Fence Fabrication", "Structural Welding",
  // Automotive & Mechanics
  "Auto Repair", "Car Diagnosis & Troubleshooting", "Oil Change & Maintenance",
  "Brake Repair", "Tire Change & Rotation", "Engine Repair", "Motorcycle Repair",
  "Diesel Mechanic", "Car Wash & Detailing", "Auto Electrical", "Air Conditioning (Auto)",
  // Mechanical & Industrial
  "Machinist", "CNC Operation", "Millwright", "Industrial Equipment Repair",
  "Hydraulic System Repair", "Conveyor System Maintenance", "Elevator Maintenance", "Boiler Operation",
  // IT & Technology
  "Computer Repair", "Laptop Repair", "Network Setup", "Wi-Fi Installation",
  "IT Support", "Data Recovery", "Software Troubleshooting", "CCTV & Security Systems",
  "Smart Home Installation", "Web Design", "Graphic Design", "Data Entry",
  // Electronics & Telecom
  "Phone Repair", "TV Repair", "Appliance Repair", "Electronics Repair",
  "Telecommunications Installation", "Fiber Optic Installation",
  // Food & Culinary
  "Cooking", "Catering", "Baking & Pastry", "Butchering",
  "Food Preparation", "Bartending", "Personal Chef",
  // Tailoring & Fashion
  "Tailoring", "Dressmaking", "Clothing Alterations", "Embroidery",
  "Shoe Repair", "Bag & Leather Repair",
  // Transportation & Logistics
  "Driving", "Delivery", "Courier Service", "Freight & Trucking",
  "Crane Operation", "Forklift Operation", "Motorbike Delivery",
  // Health & Medical
  "First Aid & Emergency Response", "Blood Pressure Monitoring",
  "Elderly Care", "Disability Assistance", "Home Nursing",
  "Medical Equipment Operation", "Pharmacy Assistance",
  // Safety & Security
  "Security Guard", "Fire Safety", "Security System Installation", "Alarm System Setup",
  // Beauty & Personal Care
  "Haircut & Styling", "Hair Coloring", "Barbering", "Makeup Artist",
  "Bridal Makeup", "Nail Art & Manicure", "Pedicure", "Massage Therapy",
  "Swedish Massage", "Shiatsu Massage", "Facial Treatment", "Waxing",
  "Eyelash Extension", "Eyebrow Threading", "Tattoo",
  // Pet Care & Grooming
  "Pet Grooming", "Dog Walking", "Pet Bathing", "Pet Sitting", "Veterinary Assistance",
  // Other / General
  "Babysitting", "Tutoring", "Photography", "Videography",
  "Event Planning", "Accounting", "Bookkeeping",
];

const SkillSchema = new mongoose.Schema({
  name:       { type: String, required: true, unique: true, lowercase: true, trim: true },
  label:      { type: String, required: true, trim: true },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

async function seedSkills(): Promise<{ inserted: number; skipped: number }> {
  const SkillModel = mongoose.models.Skill ?? mongoose.model("Skill", SkillSchema);
  let inserted = 0;
  let skipped  = 0;
  for (const label of SKILL_SEEDS) {
    const name = label.toLowerCase();
    const exists = await SkillModel.findOne({ name });
    if (!exists) {
      await SkillModel.create({ name, label, usageCount: 0 });
      inserted++;
    } else {
      skipped++;
    }
  }
  return { inserted, skipped };
}

async function seedSettings(): Promise<{ inserted: number; skipped: number }> {
  const AppSetting = mongoose.models.AppSetting ?? mongoose.model("AppSetting", AppSettingSchema);
  let inserted = 0;
  let skipped  = 0;
  for (const setting of DEFAULT_SETTINGS) {
    const exists = await AppSetting.findOne({ key: setting.key });
    if (!exists) {
      await AppSetting.create(setting);
      inserted++;
    } else {
      skipped++;
    }
  }
  return { inserted, skipped };
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
    action: "full_reset" | "seed_only" | "seed_settings" | "seed_skills" | "clear_collection";
    collection?: string;
    confirmToken: string;
  };

  const expectedToken = process.env.DB_RESET_TOKEN ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!expectedToken || body.confirmToken !== expectedToken) {
    throw new ForbiddenError("Invalid confirmation token.");
  }

  if (!["full_reset", "seed_only", "seed_settings", "seed_skills", "clear_collection"].includes(body.action)) {
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

  // seed_settings only
  if (body.action === "seed_settings") {
    const { inserted, skipped } = await seedSettings();
    log.push(`Settings: ${inserted} inserted, ${skipped} already exist — skipped`);
    return NextResponse.json({ success: true, log });
  }

  // seed_skills only
  if (body.action === "seed_skills") {
    const { inserted, skipped } = await seedSkills();
    log.push(`Skills: ${inserted} inserted, ${skipped} already exist — skipped`);
    return NextResponse.json({ success: true, log });
  }

  // Seed (both full_reset and seed_only)
  const catInserted = await seedCategories(db);
  log.push(`Categories: ${catInserted} seeded`);

  const adminCreated = await seedAdmin(db);
  log.push(adminCreated ? "Admin user created" : "Admin user already exists — skipped");

  const { inserted: settingsInserted, skipped: settingsSkipped } = await seedSettings();
  log.push(`Settings: ${settingsInserted} inserted, ${settingsSkipped} already exist — skipped`);

  const { inserted: skillsInserted, skipped: skillsSkipped } = await seedSkills();
  log.push(`Skills: ${skillsInserted} inserted, ${skillsSkipped} already exist — skipped`);

  return NextResponse.json({ success: true, log });
});
