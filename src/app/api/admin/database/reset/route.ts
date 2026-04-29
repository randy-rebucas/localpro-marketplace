/**
 * POST /api/admin/database/reset
 *
 * Body: { action: "full_reset" | "seed_only" | "clear_collection", collection?: string, confirmToken: string }
 *
 * - full_reset:       Clears all app data collections + re-seeds categories, skills, admin user
 * - seed_only:        Inserts missing seed data without wiping existing records
 * - clear_collection: Clears a single named collection
 *
 * Requires confirmToken === process.env.DB_RESET_TOKEN (must be set explicitly; no fallback).
 * Admin-only. Never available in production unless DB_RESET_ENABLED=true.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { UnprocessableError, ForbiddenError } from "@/lib/errors";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { checkRateLimit } from "@/lib/rateLimit";
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
  { key: "payments.escrowServiceFeeRate",  value: 2,      description: "Non-refundable escrow service fee charged to the client at checkout (whole number %)." },
  { key: "payments.processingFeeRate",      value: 2,      description: "Non-refundable payment processing fee passed to the client to cover gateway costs (whole number %)." },
  { key: "payments.withdrawalFeeBank",      value: 20,     description: "Flat withdrawal fee for standard bank transfer payouts (PHP)." },
  { key: "payments.withdrawalFeeGcash",     value: 15,     description: "Flat withdrawal fee for GCash / Maya payouts (PHP)." },
  { key: "payments.urgencyFeeSameDay",      value: 50,     description: "Flat urgent booking fee for same-day bookings (PHP). Non-refundable." },
  { key: "payments.urgencyFeeRush",         value: 100,    description: "Flat urgent booking fee for 2-hour rush bookings (PHP). Non-refundable." },
  { key: "limits.maxQuotesPerJob",         value: 5,      description: "Maximum provider quotes allowed per job." },
  { key: "limits.quoteValidityDays",       value: 7,      description: "Days before a submitted quote auto-expires." },
  { key: "limits.maxActiveJobsPerClient",  value: 10,     description: "Maximum concurrent active jobs per client." },
  { key: "payments.trainingEnabled",       value: true,   description: "Whether the training / upskilling course system is enabled for providers." },
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

// ─── Training Course Seed Data ────────────────────────────────────────────────

const COURSE_SEEDS = [
  // ── Platform Guides (free) ──────────────────────────────────────────────────
  {
    title: "Getting Started on LocalPro", slug: "localpro-getting-started",
    description: "A complete walkthrough of the LocalPro platform for new providers. Learn how to set up your profile, understand the dashboard, connect your payment method, and land your first job.",
    category: "custom", price: 0, durationMinutes: 20, badgeSlug: "localpro-onboarding",
    lessons: [
      { title: "Welcome to LocalPro", content: "# Welcome to LocalPro\n\nLocalPro connects skilled service providers with clients who need work done.\n\n## What you will learn\n- How the platform works end-to-end\n- Setting up a winning profile\n- Understanding your dashboard\n- How payments and escrow protect you", durationMinutes: 3, order: 0 },
      { title: "Setting Up Your Provider Profile", content: "# Setting Up Your Provider Profile\n\nYour profile is your storefront. Clients judge you before they ever message you.\n\n## Profile checklist\n- Upload a clear, professional profile photo\n- Write a bio that explains your experience and specialties\n- Add your skills (be specific)\n- Set your service areas\n- Add past work experience", durationMinutes: 5, order: 1 },
      { title: "Navigating Your Dashboard", content: "# Navigating Your Dashboard\n\n## Key sections\n\n### Jobs\nBrowse open jobs in your area.\n\n### Bids\nTrack all your active bids — accepted, pending, and rejected.\n\n### Bookings\nOnce a client accepts your bid, manage your schedule.\n\n### Earnings\nView transaction history, pending payouts, and completed earnings.", durationMinutes: 4, order: 2 },
      { title: "KYC Verification — Why It Matters", content: "# KYC Verification\n\nKYC verification unlocks full bidding and payout features.\n\n## Why verify?\n- Clients see a Verified badge on your profile\n- You can withdraw earnings to your bank or e-wallet\n- Access higher-value job categories\n\n## How to verify\n1. Go to Profile > Verification\n2. Upload a valid government-issued ID\n3. Take a live selfie\n4. Submit and wait 1-2 business days", durationMinutes: 4, order: 3 },
      { title: "Getting Your First Review", content: "# Getting Your First Review\n\nProviders with at least one 5-star review receive 40% more job invites.\n\n## How to earn great reviews\n1. Communicate proactively\n2. Arrive on time\n3. Clean up after yourself\n4. Ask politely after completing the job", durationMinutes: 4, order: 4 },
    ],
  },
  {
    title: "How to Win Jobs on LocalPro", slug: "localpro-winning-jobs",
    description: "Learn the bidding strategy, proposal writing, and client communication skills that top-rated providers use to consistently win jobs on LocalPro.",
    category: "custom", price: 0, durationMinutes: 25, badgeSlug: "localpro-top-bidder",
    lessons: [
      { title: "Understanding the Job Feed", content: "# Understanding the Job Feed\n\nThe job feed shows all open jobs posted by clients in your service area.\n\n## How jobs are ranked\n- Newest first by default\n- Jobs with fewer bids are better opportunities\n\n## What to look for\n- Budget range vs. your typical rate\n- Job description quality\n- Client history", durationMinutes: 5, order: 0 },
      { title: "Writing a Winning Proposal", content: "# Writing a Winning Proposal\n\n## The winning formula\n1. Reference the specific job\n2. State your relevant experience with numbers\n3. Explain your approach step by step\n4. Give a realistic timeline\n5. End with a question about the job", durationMinutes: 7, order: 1 },
      { title: "Pricing Your Services", content: "# Pricing Your Services\n\n## Do not race to the bottom\nThe cheapest bid rarely wins. Clients want confidence, not the lowest price.\n\n## How to price well\n- Research what similar jobs pay in your area\n- Factor in materials, travel time, and complexity\n- Add a 10-15% buffer for unexpected complications", durationMinutes: 5, order: 2 },
      { title: "Communicating With Clients", content: "# Communicating With Clients\n\n## Response time is everything\nClients message multiple providers. The first to respond with quality usually wins.\n\n## Golden rules\n1. Reply within 30 minutes when available\n2. Use full sentences\n3. Confirm details before showing up\n4. Update proactively", durationMinutes: 5, order: 3 },
      { title: "Managing Your Availability", content: "# Managing Your Availability\n\n## Set your status\n- Available — actively looking for work\n- Busy — taking jobs but calendar is filling\n- Unavailable — on break or fully booked\n\n## Calendar discipline\n- Block out personal days in advance\n- Do not double-book\n- Cancellations hurt your rating", durationMinutes: 3, order: 4 },
    ],
  },
  {
    title: "Escrow and Payments Explained", slug: "localpro-escrow-payments",
    description: "Understand exactly how LocalPro's escrow system protects both you and your clients — from job acceptance to payout to your e-wallet or bank account.",
    category: "custom", price: 0, durationMinutes: 15, badgeSlug: "localpro-payments-certified",
    lessons: [
      { title: "What Is Escrow and Why It Protects You", content: "# What Is Escrow?\n\nEscrow is a neutral holding system. When a client hires you, they deposit the job payment into escrow — held securely until the job is done.\n\n## The payment flow\n1. Client accepts your bid\n2. Client funds escrow\n3. You do the work\n4. Job is marked complete\n5. Escrow is released to you minus platform fee", durationMinutes: 5, order: 0 },
      { title: "Platform Fees and Your Actual Earnings", content: "# Platform Fees\n\nLocalPro charges a small service fee per transaction. The fee is deducted from the agreed job amount.\n\nAlways confirm the final payout amount in the job detail screen before accepting.", durationMinutes: 4, order: 1 },
      { title: "Withdrawing Your Earnings", content: "# Withdrawing Your Earnings\n\n## How to withdraw\n1. Go to Wallet > Withdraw\n2. Choose your payout method (GCash, Maya, Bank Transfer)\n3. Enter the amount\n4. Confirm and wait for processing\n\n## Processing times\n- GCash / Maya: Usually within 24 hours\n- Bank Transfer: 1-3 business days", durationMinutes: 3, order: 2 },
      { title: "What Happens in a Dispute", content: "# Disputes\n\n## When a dispute is filed\n1. Job is paused\n2. Both parties submit evidence\n3. LocalPro admin reviews within 3-5 business days\n4. Admin decides: full release, partial release, or refund\n\n## How to protect yourself\n- Take before and after photos\n- Communicate everything in-app\n- Get client sign-off when done", durationMinutes: 3, order: 3 },
    ],
  },
  {
    title: "Building a 5-Star Provider Profile", slug: "localpro-5star-profile",
    description: "A practical guide to optimizing every part of your LocalPro profile to attract more clients, earn better reviews, and rank higher in search results.",
    category: "custom", price: 0, durationMinutes: 18, badgeSlug: "localpro-profile-pro",
    lessons: [
      { title: "Profile Photo and First Impressions", content: "# Profile Photo and First Impressions\n\n## What makes a great provider photo\n- Face is clearly visible\n- Neutral or outdoor background\n- Wearing work clothes or professional attire\n- Smiling, approachable expression\n- Good lighting", durationMinutes: 3, order: 0 },
      { title: "Writing Your Provider Bio", content: "# Writing Your Provider Bio\n\n## Structure that works\n\nOpening — your specialty and years of experience\n\nWhat you do — specific services\n\nWhy clients choose you\n\nCall to action\n\n## Length\nAim for 80-150 words.", durationMinutes: 5, order: 1 },
      { title: "Skills, Experience and Certifications", content: "# Skills, Experience and Certifications\n\n## Skills\n- Add every specific skill you have\n- Be precise: Inverter AC Installation beats just AC\n\n## Certifications\n- Upload any TESDA certificates or licenses\n- LocalPro Training badges appear automatically on your profile", durationMinutes: 5, order: 2 },
      { title: "Managing Reviews and Your Rating", content: "# Managing Reviews and Your Rating\n\n## How ratings are calculated\nYour rating is a weighted average of all client star ratings.\n\n## Responding to reviews\n- Keep responses professional — even to unfair reviews\n- A gracious response to a bad review impresses future clients", durationMinutes: 5, order: 3 },
    ],
  },
  // ── Professional Courses ────────────────────────────────────────────────────
  {
    title: "Workplace Safety and First Aid Essentials", slug: "workplace-safety-first-aid",
    description: "Essential safety knowledge for any service provider — hazard identification, PPE use, emergency response, and basic first aid.",
    category: "safety", price: 0, durationMinutes: 45, badgeSlug: "safety-first-aid-certified",
    lessons: [
      { title: "Hazard Identification and Risk Assessment", content: "# Hazard Identification\n\n## Common job-site hazards\n- Electrical: exposed wires, wet conditions near outlets\n- Physical: sharp tools, heavy lifting, working at heights\n- Chemical: cleaning agents, paint fumes, solvents\n\n## Risk assessment process\n1. Identify the hazard\n2. Who could be harmed?\n3. How likely and how severe?\n4. What controls reduce the risk?\n5. Review after the job", durationMinutes: 8, order: 0 },
      { title: "Personal Protective Equipment", content: "# Personal Protective Equipment (PPE)\n\n| Job Type | Essential PPE |\n|----------|---------------|\n| Electrical | Insulated gloves, rubber-soled shoes |\n| Plumbing | Waterproof gloves, safety goggles |\n| Cleaning | Chemical-resistant gloves, mask |\n| Carpentry | Safety glasses, steel-toe boots |\n\n## PPE rules\n- Inspect PPE before each use\n- Replace damaged equipment immediately", durationMinutes: 7, order: 1 },
      { title: "Basic First Aid for Cuts, Burns and Falls", content: "# Basic First Aid\n\n## Cuts and Wounds\n1. Apply direct pressure\n2. Elevate above the heart\n3. Clean with running water\n4. Apply antibiotic ointment and cover\n\n## Burns\n- Minor burns: Cool under running water for 10+ minutes. Never use ice.\n- Serious burns: Cover loosely and go to ER immediately\n\n## Falls\n- Do not move someone who fell from height until paramedics arrive", durationMinutes: 8, order: 2 },
      { title: "Fire Safety and Emergency Exits", content: "# Fire Safety\n\n## The PASS technique\n- **P**ull the pin\n- **A**im at the base of the fire\n- **S**queeze the handle\n- **S**weep side to side\n\n## Before starting any job\n- Identify fire exits\n- Know where the fire extinguisher is located\n- Never block exits with tools or materials", durationMinutes: 7, order: 3 },
      { title: "Heat Stress and Outdoor Work Safety", content: "# Heat Stress\n\n## Signs of heatstroke (emergency)\n- Body temperature 39.4°C or higher\n- Hot, red, dry skin with no sweating\n- Rapid strong pulse and confusion\n\n## Prevention\n- Drink one cup of water every 20 minutes\n- Work in the shade when possible\n- Take 10-minute rest breaks in shade every hour", durationMinutes: 8, order: 4 },
      { title: "Electrical Safety for Non-Electricians", content: "# Electrical Safety for Non-Electricians\n\n## The golden rules\n1. Never assume a wire is dead — test with a non-contact voltage tester\n2. Turn off the circuit breaker before working near wiring\n3. Never work on electrical systems in wet conditions\n\n## When to stop and call an electrician\n- Any exposed or sparking wires\n- Burning smell from outlets or panels", durationMinutes: 7, order: 5 },
    ],
  },
  {
    title: "Customer Service for Service Providers", slug: "customer-service-for-providers",
    description: "Learn the professional communication, conflict resolution, and client management skills that separate average providers from top-rated ones on LocalPro.",
    category: "basic", price: 0, durationMinutes: 35, badgeSlug: "customer-service-pro",
    lessons: [
      { title: "Professional Communication Basics", content: "# Professional Communication Basics\n\nCommunication accounts for roughly 40% of your review score.\n\n## Written communication\n- Use full sentences — no slang\n- Respond within 30 minutes when active\n- Confirm details before showing up\n\n## On-site communication\n- Introduce yourself and shake hands\n- Explain what you are about to do before you do it", durationMinutes: 7, order: 0 },
      { title: "Setting and Managing Expectations", content: "# Setting and Managing Expectations\n\nThe number one cause of bad reviews is unmet expectations — not bad work.\n\n## How to set expectations\n1. Be specific in your proposal\n2. State what is NOT included\n3. Give a realistic time estimate with a 20% buffer\n\n## When something unexpected comes up\n- Stop and notify the client immediately\n- Present options with cost implications\n- Let the client decide before proceeding", durationMinutes: 7, order: 1 },
      { title: "Handling Complaints and Difficult Clients", content: "# Handling Complaints\n\n## The HEARD method\n- **H**ear — let them finish without interrupting\n- **E**mpathize — I understand why you are upset\n- **A**pologize — for the experience, even if not at fault\n- **R**esolve — offer a specific solution\n- **D**elight — go slightly beyond what was promised", durationMinutes: 8, order: 2 },
      { title: "After-Service Follow-Up", content: "# After-Service Follow-Up\n\n## The 3-step follow-up\n\n**Step 1** — End-of-job confirmation (same day)\n\n**Step 2** — Review request (24-48 hours later)\n\n**Step 3** — Seasonal check-in (1-2 months later)\n\nKeep all follow-ups inside the LocalPro app.", durationMinutes: 6, order: 3 },
      { title: "Building Long-Term Client Relationships", content: "# Building Long-Term Client Relationships\n\nGetting a new client costs 5 times more effort than retaining an existing one.\n\n## How to become a client's go-to provider\n1. Remember details — note their preferences\n2. Be reliable — show up when you say you will\n3. Educate — share small useful tips related to their home\n4. Use seasonal reminders", durationMinutes: 7, order: 4 },
    ],
  },
  {
    title: "Plumbing Fundamentals for Beginners", slug: "plumbing-fundamentals",
    description: "Build a solid foundation in residential plumbing — water systems, common fixtures, leak diagnosis, and basic repairs.",
    category: "basic", price: 199, durationMinutes: 60, badgeSlug: "plumbing-fundamentals-badge",
    lessons: [
      { title: "How Residential Water Systems Work", content: "# Residential Water Systems\n\n## The supply side\n- Water enters from the main supply line\n- Passes through the main shutoff valve\n- Branches to cold water lines\n- Hot water lines branch from the water heater\n\n## First thing on every job\nLocate the main shutoff valve before starting any plumbing work.", durationMinutes: 8, order: 0 },
      { title: "Common Pipes and Fittings", content: "# Common Pipes and Fittings\n\n| Type | Use |\n|------|-----|\n| PVC | Drain and waste |\n| CPVC | Hot and cold supply |\n| PPR | Modern supply lines |\n| PEX | Flexible supply |\n\n## Common fittings\nElbow, Tee, Coupling, Union, Reducer, Cap", durationMinutes: 10, order: 1 },
      { title: "Diagnosing and Fixing Leaks", content: "# Diagnosing and Fixing Leaks\n\n## Diagnosis steps\n1. Turn off all fixtures\n2. Check the water meter — is it still moving?\n3. Inspect visible pipes for moisture or staining\n4. Check under sinks and behind toilet tanks\n\n## Quick fixes\n- Dripping faucet: Replace the washer or cartridge\n- Leaking joint: Dry, apply Teflon tape, re-tighten", durationMinutes: 12, order: 2 },
      { title: "Toilet Repair and Replacement", content: "# Toilet Repair\n\n| Problem | Likely Cause | Fix |\n|---------|-------------|-----|\n| Running toilet | Faulty flapper | Replace flapper |\n| Weak flush | Low water level | Adjust fill valve |\n| Rocking toilet | Failed wax ring | Replace wax ring |\n| Will not flush | Clogged drain | Plunge or snake |", durationMinutes: 10, order: 3 },
      { title: "Drain Cleaning Methods", content: "# Drain Cleaning Methods\n\n## From least to most invasive\n1. Boiling water — minor grease clogs\n2. Plunger — cup plunger for sinks\n3. Drain snake — hand crank auger\n4. Chemical drain cleaner — use sparingly\n5. Hydro jetting — high-pressure water", durationMinutes: 10, order: 4 },
      { title: "Water Heater Basics and Installation", content: "# Water Heater Basics\n\n## Types\n- Instant / tankless — heats on demand\n- Storage tank — heats and stores\n- Solar — eco-friendly\n\n## Installation steps\n1. Shut off water and power or gas\n2. Drain and disconnect old unit\n3. Install new unit\n4. Connect supply lines and power or gas\n5. Turn on water and test for leaks", durationMinutes: 10, order: 5 },
    ],
  },
  {
    title: "Electrical Safety Certification", slug: "electrical-safety-certification",
    description: "Comprehensive electrical safety training: safe work practices, lockout/tagout procedures, Philippine Electrical Code wire color standards, and fault diagnosis.",
    category: "safety", price: 299, durationMinutes: 75, badgeSlug: "electrical-safety-certified",
    lessons: [
      { title: "Understanding Voltage, Current and Circuits", content: "# Voltage, Current and Circuits\n\n## The basics\n- Voltage (V) — electrical pressure. Philippine homes use 230V.\n- Current (A) — flow of electrons\n- Ohm's Law: V = I × R\n\n## Dangerous current levels\n- 10mA can cause muscle paralysis\n- 50mA can cause cardiac arrest\n\nTreat all wiring as live until verified dead.", durationMinutes: 10, order: 0 },
      { title: "Lockout Tagout LOTO Procedures", content: "# Lockout Tagout (LOTO)\n\n## Steps\n1. Identify all energy sources\n2. Notify all affected people\n3. Shut off equipment\n4. Isolate energy source (turn off breaker)\n5. Lock with a personal padlock\n6. Tag it: DO NOT OPERATE\n7. Verify dead with a voltage tester\n8. Work safely\n9. Remove lock only when complete\n\nNever rely on someone else's word that a circuit is dead.", durationMinutes: 12, order: 1 },
      { title: "Philippine Electrical Code Wire Colors", content: "# Wire Color Coding — PEC Standard\n\n| Color | Use |\n|-------|-----|\n| Black | Phase A / Line (Hot) |\n| Red | Phase B |\n| Blue | Phase C |\n| Green/Yellow | Ground |\n| White/Gray | Neutral |\n\n## Wire sizing\n- No. 14 AWG — 15A circuits\n- No. 12 AWG — 20A circuits\n- No. 10 AWG — 30A circuits", durationMinutes: 13, order: 2 },
      { title: "Common Wiring Faults and Diagnosis", content: "# Common Wiring Faults\n\n| Fault | Symptom |\n|-------|---------|\n| Open circuit | No power to load |\n| Short circuit | Breaker trips immediately |\n| Ground fault | GFCI trips, tingling feeling |\n| Overloaded circuit | Trips under load |\n\n## Systematic troubleshooting\n1. Check the panel — are any breakers tripped?\n2. Reset; does it trip again immediately?\n3. Test outlets\n4. Use a multimeter to trace toward the source", durationMinutes: 15, order: 3 },
      { title: "Safe Outlet and Switch Installation", content: "# Outlet and Switch Installation\n\n## Outlet wiring\n1. Ground wire (green or bare) to green screw\n2. Neutral (white) to silver screw\n3. Hot (black) to brass screw\n4. Push neatly into box and install cover plate\n5. Restore power and test\n\n## GFCI outlets are required\n- Within 1 meter of any water source\n- Outdoor outlets\n- Garages", durationMinutes: 15, order: 4 },
      { title: "Panel Board and Breaker Safety", content: "# Panel Board Safety\n\n## Warning signs of a dangerous panel\n- Double-tapped breakers\n- Signs of burning or heat discoloration\n- Rust or moisture inside the panel\n- Oversized breakers\n- Unlabeled circuits\n\n## Safe working practices\n- Never work on the panel while the utility side is live\n- Always use insulated tools\n- Label every circuit you work on", durationMinutes: 10, order: 5 },
    ],
  },
  {
    title: "Professional Home Cleaning Standards", slug: "professional-home-cleaning",
    description: "Master the techniques, products, and workflow used by professional cleaning services. Covers room-by-room standards, deep cleaning methods, and specialty surface care.",
    category: "basic", price: 149, durationMinutes: 40, badgeSlug: "professional-cleaner-certified",
    lessons: [
      { title: "Cleaning Solutions and Product Safety", content: "# Cleaning Solutions and Safety\n\n| Product | Use | Do NOT mix with |\n|---------|-----|-----------------|\n| Bleach | Disinfection and mold | Ammonia and vinegar |\n| Vinegar | Mineral deposits | Bleach |\n| Baking soda | Gentle abrasive | — |\n\n## Safety rules\n- Always wear gloves\n- Open windows to ventilate\n- Never mix bleach with anything except water", durationMinutes: 8, order: 0 },
      { title: "The Professional Cleaning Workflow", content: "# The Professional Cleaning Workflow\n\n## Golden rules\n1. Top to bottom — dust falls\n2. Dry before wet — dust before mopping\n3. Let products dwell — spray, wait, then wipe\n\n## Standard room sequence\n1. Declutter\n2. Dust everything\n3. Clean windows and mirrors\n4. Wipe surfaces\n5. Vacuum or sweep\n6. Mop floor backwards toward the door", durationMinutes: 8, order: 1 },
      { title: "Bathroom Deep Cleaning", content: "# Bathroom Deep Cleaning\n\n## Apply and dwell first\nApply all cleaners before touching anything else. Let them work while you handle other areas.\n\n## Order of operations\n1. Apply toilet bowl cleaner\n2. Spray tiles and shower walls\n3. Clean mirror and counter\n4. Scrub toilet completely\n5. Scrub shower and tub\n6. Mop floor backwards toward door", durationMinutes: 8, order: 2 },
      { title: "Specialty Surfaces Marble Wood and Stainless", content: "# Specialty Surfaces\n\n## Marble and Natural Stone\n- NEVER use vinegar or citrus cleaners — permanently etches the surface\n- Use pH-neutral stone cleaner only\n\n## Hardwood Floors\n- Vacuum with soft brush attachment first\n- Use a barely-damp mop — never wet\n\n## Stainless Steel\n- Always wipe WITH the grain\n- Never use steel wool", durationMinutes: 8, order: 3 },
      { title: "End of Clean Quality Check", content: "# End of Clean Quality Check\n\n## Walk-through checklist\n- Floors: no streaks, no debris in corners\n- Mirrors and glass: streak-free\n- Surfaces: dust-free\n- Trash: emptied and relined\n- High-touch points: disinfected\n\n## Client handover\n1. Walk through with the client\n2. Invite them to point out anything to re-do\n3. Address it immediately — never argue", durationMinutes: 8, order: 4 },
    ],
  },
  {
    title: "Running Your Service Business Professionally", slug: "running-your-service-business",
    description: "Level up from solo provider to a professional service business. Covers pricing strategy, record-keeping, Philippine tax obligations, branding, and scaling with a team.",
    category: "advanced", price: 499, durationMinutes: 50, badgeSlug: "service-business-professional",
    lessons: [
      { title: "Setting Your Rates for Profitability", content: "# Setting Your Rates\n\n## The cost-plus method\n1. Calculate your monthly fixed costs\n2. Decide how many billable days per month\n3. Divide: costs ÷ days = daily break-even\n4. Add your desired profit margin (e.g. 40%)\n\n## Market research\nCheck competitor rates on LocalPro for similar jobs.", durationMinutes: 10, order: 0 },
      { title: "Basic Record-Keeping and Budgeting", content: "# Basic Record-Keeping\n\n## What to track per job\nDate | Client | Service | Invoice | Received | Expenses | Net Profit\n\n## Why this matters\n1. BIR requires records for tax filing\n2. You can see which job types are actually profitable\n3. Proof of income for loans or visa applications", durationMinutes: 8, order: 1 },
      { title: "Tax Obligations for Freelance Providers", content: "# Tax Obligations in the Philippines\n\n## The 8% flat rate option\n- Pay 8% of all income above ₱250,000 annually\n- No quarterly percentage tax required\n- File once a year using BIR Form 1701A\n\nThis is general guidance, not legal or tax advice. Consult a CPA for your specific situation.", durationMinutes: 10, order: 2 },
      { title: "Building a Brand People Remember", content: "# Building a Brand\n\n## Low-cost branding actions\n- Branded shirt with your name or trade\n- Business cards to hand out after every job\n- Consistent profile photo across all platforms\n\n## Long-term brand building\n- Specialize: become known as the AC specialist in your area\n- Brand is built by consistent delivery, not one flashy moment", durationMinutes: 10, order: 3 },
      { title: "Scaling by Hiring and Managing a Team", content: "# Scaling With a Team\n\n## When to hire your first helper\n- You are regularly turning down jobs\n- Your earnings have plateaued\n- You have recurring clients who need more than you can deliver alone\n\n## Managing quality\n- Create a job checklist for every service type\n- Do periodic spot checks\n- Your name is on every job they do", durationMinutes: 12, order: 4 },
    ],
  },
  {
    title: "LocalPro Verified Cleaner", slug: "localpro-verified-cleaner",
    description: "The official LocalPro certification for cleaning professionals. Complete all 5 lessons to earn the LocalPro Verified Cleaner badge and stand out to clients.",
    category: "certification", price: 0, durationMinutes: 40, badgeSlug: "localpro-verified-cleaner",
    lessons: [
      { title: "Service Delivery SOP", content: "# Service Delivery SOP\n\nA Standard Operating Procedure (SOP) is the backbone of a professional cleaning service.\n\n## Pre-arrival checklist\n- Confirm booking details with the client the evening before\n- Prepare your kit: check supplies are stocked and tools are clean\n- Arrive on time — punctuality signals professionalism\n\n## On-site protocol\n1. Greet the client and confirm the scope of work\n2. Do a quick walkthrough to flag pre-existing damage\n3. Follow the room sequence: top to bottom, back to front\n4. Never leave without a client sign-off", durationMinutes: 8, order: 0 },
      { title: "Customer Handling Standards", content: "# Customer Handling Standards\n\n## First impressions matter\n- Wear your branded shirt or a clean, presentable uniform\n- Address clients respectfully: \"Ma'am\", \"Sir\" or their preferred name\n\n## Handling complaints\n1. Listen completely without interrupting\n2. Acknowledge: \"I understand, I'm sorry about that.\"\n3. Offer an immediate remedy — re-do the area now, not later\n4. Thank the client for telling you\n\n## What to never do\n- Never argue, even if you believe the client is wrong\n- Never use your phone while working in the client's home\n- Never invite personal guests to the job site", durationMinutes: 8, order: 1 },
      { title: "Safety Protocols for Cleaning Jobs", content: "# Safety Protocols for Cleaning Jobs\n\n## Chemical safety\n- Read labels — never mix bleach and ammonia (produces toxic fumes)\n- Wear gloves when using disinfectants or descalers\n- Store chemicals upright and away from heat sources\n\n## Physical safety\n- Use a stable step stool — never stand on chairs or countertops\n- Lift heavy objects with your legs, not your back\n- Dispose of sharps (broken glass, needles) in a dedicated sealed container — never directly in a trash bag\n\n## Emergency\n- Know where the client's first aid kit is located\n- For chemical contact with eyes, flush with water for 15 minutes and seek medical help", durationMinutes: 8, order: 2 },
      { title: "Tools & Supplies Checklist", content: "# Tools & Supplies Checklist\n\n## Essential cleaning kit\n- Microfiber cloths (color-coded by area: red=bathroom, blue=general, green=kitchen)\n- Mop and bucket with wringer\n- Vacuum cleaner with attachments\n- Spray bottles (labeled)\n- Toilet brush (dedicated, never cross-contaminate)\n\n## Cleaning agents\n- All-purpose cleaner\n- Bathroom descaler / toilet cleaner\n- Glass and mirror cleaner\n- Floor mop solution (appropriate for surface type)\n\n## Maintenance\n- Wash microfiber cloths after every job\n- Disinfect mop heads weekly\n- Keep an inventory log and reorder before you run out", durationMinutes: 8, order: 3 },
      { title: "Reporting & App Usage Standards", content: "# Reporting & App Usage Standards\n\n## Before the job\n- Mark yourself \"On the way\" in the LocalPro app when you depart\n- Upload a photo of your clean kit before entering the property\n\n## During the job\n- If you discover damage, photograph it immediately and inform the client\n- For scope changes (e.g., extra rooms), create a change order through the app\n\n## After the job\n- Upload your completion photos\n- Request the client to confirm completion in the app\n- Collect payment through the platform — no cash side deals\n- Write a short job note for your own records", durationMinutes: 8, order: 4 },
    ],
  },
  {
    title: "LocalPro Certified Technician", slug: "localpro-certified-technician",
    description: "The official LocalPro certification for appliance and electrical technicians. Master the professional standards required to carry the LocalPro Certified Technician badge.",
    category: "certification", price: 0, durationMinutes: 45, badgeSlug: "localpro-certified-technician",
    lessons: [
      { title: "Technician Code of Practice", content: "# Technician Code of Practice\n\n## Core principles\n1. **Safety first** — never rush a job to save time\n2. **Honesty** — provide accurate diagnoses; never invent faults\n3. **Transparency** — quote before you start; charge what you quoted\n\n## Scope creep\n- If you discover additional issues, stop and communicate before proceeding\n- Get verbal or written approval for additional charges\n- Document everything through the app\n\n## Professionalism on site\n- Lay a drop cloth before working — leave no mess\n- Return all furniture and covers to their original position\n- Never attempt work beyond your competence; refer and explain why", durationMinutes: 9, order: 0 },
      { title: "Client Communication Standards", content: "# Client Communication Standards\n\n## The three-step diagnostic conversation\n1. Ask the client to describe the problem in their own words\n2. Ask how long the issue has been present and what changed\n3. Confirm the symptoms before touching anything\n\n## Explaining technical issues to non-technical clients\n- Use everyday analogies: \"Think of the capacitor like your car battery.\"\n- Avoid unnecessary jargon\n- Show, don't just tell: point to the fault if safe to do so\n\n## Post-repair handover\n- Demonstrate that the unit now works correctly\n- Explain what you did in plain language\n- Advise on maintenance to prevent recurrence\n- Confirm completion in the app together with the client", durationMinutes: 9, order: 1 },
      { title: "Workshop Safety & PPE", content: "# Workshop Safety & PPE\n\n## Mandatory PPE by task\n| Task | Minimum PPE |\n|------|-------------|\n| Electrical work | Insulated gloves, safety glasses |\n| Refrigerant handling | Chemical-resistant gloves, eye protection |\n| Grinding/cutting | Face shield, hearing protection |\n| Ladder work | Non-slip footwear, spotter present |\n\n## Electrical safety non-negotiables\n- Always isolate and tag-out before working on live panels\n- Use a voltage tester before touching any wire\n- Never work alone on high-voltage systems\n\n## Refrigerant safety\n- Work in a ventilated area\n- Never vent refrigerant into the atmosphere — it is illegal and harmful", durationMinutes: 9, order: 2 },
      { title: "Equipment Checklist & Maintenance Protocols", content: "# Equipment Checklist & Maintenance Protocols\n\n## Field kit essentials\n- Digital multimeter (calibrated)\n- Insulated screwdriver set\n- Crimping tool and wire strippers\n- Cable ties and electrical tape\n- Spare fuses and contactors (common ratings)\n- Smartphone for app and documentation\n\n## Tool maintenance\n- Inspect insulation on all leads before every job\n- Calibrate your multimeter against a known standard quarterly\n- Replace worn cutting edges immediately\n\n## Inventory management\n- Track spare parts in and out\n- Reorder common consumables before stock hits zero\n- Never borrow parts between client jobs without billing correctly", durationMinutes: 9, order: 3 },
      { title: "Reporting Standards & App Usage", content: "# Reporting Standards & App Usage\n\n## Before the job\n- Confirm appointment and estimated arrival window with the client\n- Mark \"On the way\" in the app when departing\n\n## On site\n- Photograph the fault before disassembly\n- Upload mid-job photos for complex repairs\n- Log parts used with quantities in the job notes\n\n## Completing the job\n- Test and photograph the repaired/installed unit operating normally\n- Submit the completion report through the app\n- Issue an itemised invoice — labour + parts, never a flat undocumented amount\n- Collect client acknowledgement within the app", durationMinutes: 9, order: 4 },
    ],
  },
  {
    title: "LocalPro Professional Contractor", slug: "localpro-professional-contractor",
    description: "The official LocalPro certification for general contractors and construction professionals. Demonstrate mastery of project standards, safety, and client management to earn the badge.",
    category: "certification", price: 0, durationMinutes: 50, badgeSlug: "localpro-professional-contractor",
    lessons: [
      { title: "Contractor Standards & Professional Ethics", content: "# Contractor Standards & Professional Ethics\n\n## Core standards\n1. **Deliver what you scope** — never substitute materials without client approval\n2. **Timeline integrity** — if you will be late, communicate 24 hours in advance\n3. **Safety compliance** — your workers are your responsibility\n\n## Ethical practices\n- Provide itemised quotations — no \"package price\" opacity\n- Never request more than 50% upfront on residential projects\n- Disclose subcontractors to the client\n\n## Conflict of interest\n- Do not accept commissions from suppliers for recommending their products\n- If a conflict exists, disclose it in writing before proceeding", durationMinutes: 10, order: 0 },
      { title: "Client & Site Management", content: "# Client & Site Management\n\n## Pre-construction client meeting\n- Walk the full scope with the client\n- Clarify all grey areas in writing before work begins\n- Agree on a single primary contact person for decisions\n\n## Daily site management\n- Hold a 5-minute morning huddle with your crew\n- Keep a site diary: weather, workers present, tasks completed\n- Fence, barricade, or secure all hazardous areas\n\n## Managing client expectations\n- Share weekly progress photos through the app\n- Flag potential delays the moment you know — never surprise a client\n- For scope changes, issue a written change order with revised price and timeline before proceeding", durationMinutes: 10, order: 1 },
      { title: "Safety Compliance & Risk Assessment", content: "# Safety Compliance & Risk Assessment\n\n## Pre-job risk assessment (5 minutes)\n1. What can go wrong on this site today?\n2. Who will be harmed, and how?\n3. What control measures are in place?\n4. Who is responsible for each control?\n\n## DOLE requirements (Philippines)\n- Projects with 50+ workers must designate a Safety Officer\n- PPE is mandatory: hard hat, safety boots, high-vis vest on all sites\n- Scaffolding must bear a load tag and pass visual inspection before use\n\n## Incident response\n1. Secure the scene\n2. Provide first aid\n3. Call emergency services if needed\n4. Notify the client and document via the app within 1 hour\n5. File a report with DOLE within 24 hours for serious incidents", durationMinutes: 10, order: 2 },
      { title: "Materials & Tools Management", content: "# Materials & Tools Management\n\n## Procurement best practices\n- Obtain at least two supplier quotes for materials above ₱5,000\n- Verify brand and specification match the approved bill of quantities\n- Inspect deliveries immediately — refuse substandard goods\n\n## On-site storage\n- Store cement and sand away from standing water\n- Lock away tools at end of each day — theft is your liability\n- Maintain a materials log: received, used, waste, remaining\n\n## Wastage control\n- Tile and stone: allow 10–15% extra for cuts and breakage\n- Cement: rotate stock (FIFO) — never use expired bags\n- Cut and offcut lumber: repurpose before discarding", durationMinutes: 10, order: 3 },
      { title: "Project Reporting & Handover", content: "# Project Reporting & Handover\n\n## Progress reporting (weekly minimum)\n- Photos: wide shot, close-up of completed work, next area to be started\n- Summary: tasks completed, tasks deferred, issues encountered\n- Projected completion date update\n\n## Defects liability period\n- Standard in the Philippines: 1 year for structural defects (Civil Code Art. 1723)\n- Document what you built and with what materials — your protection against false claims\n\n## Formal handover checklist\n1. Punch list walk-through with the client\n2. Agree on snagging items and completion timeline\n3. Hand over all warranties, manuals, and as-built documentation\n4. Obtain signed completion certificate\n5. Process final payment through LocalPro platform", durationMinutes: 10, order: 4 },
    ],
  },
  {
    title: "LocalPro Verified Provider", slug: "localpro-verified-provider",
    description: "The universal baseline certification every LocalPro provider must complete. Master professional standards, platform discipline, safety compliance, and data privacy to earn the LocalPro Verified Provider badge.",
    category: "certification", price: 0, durationMinutes: 50, badgeSlug: "localpro-verified-provider",
    lessons: [
      { title: "Professional Standards — Appearance, Punctuality & Etiquette", content: "# Professional Standards\n\n## Grooming & Appearance\n- Wear clean, presentable clothing or a branded shirt on every job\n- Keep hands and tools clean — your appearance reflects your quality\n- Remove footwear or use shoe covers when entering homes, unless told otherwise\n- No strong perfume or cologne; some clients have sensitivities\n\n## Punctuality Rules\n- Arrive within the agreed time window — being late costs you stars\n- If you are running late, message the client at least 30 minutes before the scheduled time\n- If you cannot make the job, cancel through the app immediately — do not ghost\n- Repeated tardiness will trigger an account review\n\n## Client Etiquette\n- Greet clients by name; introduce yourself professionally\n- Do not bring guests, family members, or unofficial helpers to a job site\n- Ask permission before using the client's electricity, water, or restroom\n- Keep conversations professional — avoid personal or political topics\n- Leave the work area cleaner than you found it", durationMinutes: 10, order: 0 },
      { title: "Communication Scripts & Complaint Handling", content: "# Communication Scripts & Complaint Handling\n\n## Standard Communication Scripts\n\n### Opening script (on arrival)\nGood morning / afternoon, I'm [Name] from LocalPro. I'm here for the [service] booking. May I proceed?\n\n### When confirming scope\nBefore I begin, let me confirm the scope so we're aligned. Will that be okay?\n\n### When delay is expected\nI want to let you know that [reason] is taking slightly longer than expected. I expect to finish by [new time]. I apologise for the inconvenience.\n\n### When closing a job\nI've completed the work. May I walk you through what I did? Please let me know if anything needs attention.\n\n## Complaint Handling — 4-Step Method\n1. Listen — let the client speak without interrupting\n2. Acknowledge — I understand, and I'm sorry about that.\n3. Act — offer an immediate remedy (redo the area, fix the issue now)\n4. Follow up — confirm the client is satisfied before leaving\n\n## What NOT to do\n- Never argue or place blame on the client\n- Never dismiss a concern as minor\n- Never leave a complaint unresolved — escalate through the app if needed", durationMinutes: 10, order: 1 },
      { title: "Platform Discipline — App, Quotations, Job Tracking & Anti-Cancellation", content: "# Platform Discipline\n\n## App Usage Standards\n- Update your availability calendar every week\n- Mark yourself On the way when you depart for a booking\n- Upload before and after photos for every job\n- Never request payment outside the LocalPro platform\n\n## Quotation System\n- Always provide an itemised quote before starting work\n- Quote honestly — hidden charges after the fact will result in a dispute\n- If you discover additional work is needed on-site, get written approval through the app before proceeding\n- For jobs over ₱5,000, a signed quotation is required to protect both parties\n\n## Job Tracking\n- Use the app status flow: Accepted → On the way → In progress → Completed\n- Never mark a job complete before the client confirms it is done\n- Keep the client updated on progress for jobs longer than 2 hours\n- If issues arise mid-job, log them in the app immediately\n\n## Anti-Cancellation Policy\n- You may cancel penalty-free up to 24 hours before the scheduled time\n- Same-day cancellations will incur a ₱150 cancellation fee deducted from your next payout\n- Two no-shows within 30 days will result in a 7-day account suspension\n- Three no-shows within 60 days will trigger a permanent review of your account\n- Emergency exceptions (hospitalisation, natural disaster) must be documented and submitted within 48 hours", durationMinutes: 10, order: 2 },
      { title: "Workplace Safety, Liability & Compliance", content: "# Workplace Safety, Liability & Compliance\n\n## Basic Workplace Safety Rules\n- Inspect your tools and equipment before every job — do not use damaged tools\n- Use the correct Personal Protective Equipment (PPE) for the task\n- Never rush — most injuries happen when providers skip steps under time pressure\n- Secure the work area: barricade open holes, wet floors, and exposed wiring\n- Know the location of the nearest emergency exit or evacuation route\n\n## Liability Awareness\n- You are responsible for any damage you cause while on a job\n- Document the condition of the client's property before you begin (photos in the app)\n- If you break or damage something, report it immediately — do not hide it\n- LocalPro's escrow system protects clients; fraudulent claims against you are reviewed by our team\n- You are not liable for pre-existing damage — documenting it on arrival protects you\n\n## Incident Response\n1. Stop work and secure the area\n2. Provide first aid if needed; call emergency services for serious injuries\n3. Notify the client immediately\n4. Document the incident through the app within 1 hour\n\n## Your Legal Standing\n- As an independent provider, you are responsible for your own tax obligations\n- LocalPro does not withhold tax — file your own BIR returns as required\n- Keep receipts for tools, supplies, and transport — these are deductible expenses", durationMinutes: 10, order: 3 },
      { title: "Data Privacy & Documentation Standards", content: "# Data Privacy & Documentation Standards\n\n## Data Privacy (Republic Act 10173 — Data Privacy Act of 2012)\n- You will collect and access personal data from clients (name, address, contact number)\n- This information must only be used to deliver the booked service\n- Never share, sell, or post client data on social media or with third parties\n- Do not photograph client property or family members without explicit consent\n- Delete or discard any written client information after the job is complete\n\n## Common Violations to Avoid\n- Taking photos of a client's home interior and sharing them publicly\n- Saving client phone numbers for personal use after a booking\n- Passing client contact details to other providers\n- Uploading client photos to group chats or social media\n\n## Documentation Standards\n- Every job must have: a before photo, an after photo, and a client confirmation\n- Keep your own records for jobs over ₱5,000 (invoice, receipt, bank transfer proof)\n- For certification or trade work, keep a log of jobs completed — this supports future TESDA applications\n- If a dispute arises, your documentation is your strongest evidence\n\n## Profile Documentation\n- Keep your profile up to date: valid ID, current skills, active service areas\n- Upload TESDA certificates or trade licences as they are earned\n- Outdated or false information on your profile is grounds for suspension", durationMinutes: 10, order: 4 },
    ],
  },
] as const;

async function seedCourses(createdBy: string): Promise<{ inserted: number; skipped: number }> {
  const InlineLessonSchema = new mongoose.Schema(
    { title: String, content: String, durationMinutes: { type: Number, default: 5 }, order: Number },
    { _id: true }
  );
  const InlineCourseSchema = new mongoose.Schema({
    title: String, slug: { type: String, unique: true }, description: String,
    category: String, price: Number, durationMinutes: Number,
    badgeSlug: { type: String, unique: true }, isPublished: { type: Boolean, default: false },
    lessons: { type: [InlineLessonSchema], default: [] },
    enrollmentCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }, { timestamps: true });

  const TrainingCourse =
    (mongoose.models.TrainingCourse as mongoose.Model<mongoose.Document>) ??
    mongoose.model("TrainingCourse", InlineCourseSchema);

  let inserted = 0;
  let skipped  = 0;
  for (const course of COURSE_SEEDS) {
    const exists = await TrainingCourse.findOne({ slug: course.slug }).lean();
    if (!exists) {
      await TrainingCourse.create({ ...course, isPublished: false, createdBy });
      inserted++;
    } else {
      skipped++;
    }
  }
  return { inserted, skipped };
}

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Guard: must be explicitly enabled
  if (process.env.DB_RESET_ENABLED !== "true") {
    throw new ForbiddenError(
      "Database reset is disabled. Set DB_RESET_ENABLED=true in your environment to enable it."
    );
  }

  const body = await req.json() as {
    action: "full_reset" | "seed_only" | "seed_settings" | "seed_skills" | "seed_courses" | "clear_collection";
    collection?: string;
    confirmToken: string;
  };

  const expectedToken = process.env.DB_RESET_TOKEN;
  if (!expectedToken) {
    throw new ForbiddenError("DB_RESET_TOKEN is not configured. Set it explicitly in your environment.");
  }
  if (body.confirmToken !== expectedToken) {
    throw new ForbiddenError("Invalid confirmation token.");
  }

  if (!["full_reset", "seed_only", "seed_settings", "seed_skills", "seed_courses", "clear_collection"].includes(body.action)) {
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

  // seed_courses only
  if (body.action === "seed_courses") {
    const { inserted, skipped } = await seedCourses(user.userId);
    log.push(`Courses: ${inserted} inserted, ${skipped} already exist — skipped`);
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
