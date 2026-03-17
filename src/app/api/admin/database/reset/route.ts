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

  const expectedToken = process.env.DB_RESET_TOKEN ?? process.env.NEXTAUTH_SECRET ?? "";
  if (!expectedToken || body.confirmToken !== expectedToken) {
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
