/**
 * Training Courses Seed Script
 * Usage:  node --env-file=.env.local scripts/seed-courses.mjs
 * Flags:
 *   --force    Overwrite existing courses with seed data
 *   --wipe     Drop ALL courses then re-insert (full reseed)
 *   --publish  Publish all courses immediately (default: draft)
 */

import mongoose from "mongoose";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Auto-load .env.local ─────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const raw = t.slice(eq + 1).trim();
    const v = /^(["']).*\1$/.test(raw) ? raw.slice(1, -1) : raw;
    if (!(k in process.env)) process.env[k] = v;
  }
}

// ─── CLI flags ────────────────────────────────────────────────────────────────
const FORCE   = process.argv.includes("--force");
const WIPE    = process.argv.includes("--wipe");
const PUBLISH = process.argv.includes("--publish");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Run: node --env-file=.env.local scripts/seed-courses.mjs");
  process.exit(1);
}

// ─── Inline Mongoose Models ───────────────────────────────────────────────────

const LessonSchema = new mongoose.Schema(
  {
    title:           { type: String, required: true, trim: true },
    content:         { type: String, required: true },
    durationMinutes: { type: Number, default: 5, min: 1 },
    order:           { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const TrainingCourseSchema = new mongoose.Schema(
  {
    title:           { type: String, required: true, trim: true },
    slug:            { type: String, required: true, unique: true, trim: true, lowercase: true },
    description:     { type: String, required: true, trim: true },
    category:        { type: String, enum: ["basic", "advanced", "safety", "custom"], default: "basic" },
    price:           { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0 },
    badgeSlug:       { type: String, required: true, trim: true, unique: true },
    isPublished:     { type: Boolean, default: false },
    lessons:         { type: [LessonSchema], default: [] },
    enrollmentCount: { type: Number, default: 0, min: 0 },
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema({ role: String }, { strict: false });

const TrainingCourse =
  mongoose.models.TrainingCourse ??
  mongoose.model("TrainingCourse", TrainingCourseSchema);

const User =
  mongoose.models.User ??
  mongoose.model("User", UserSchema);

// ─── Section 1: LocalPro Platform Guides (all free) ──────────────────────────

const PLATFORM_GUIDES = [
  {
    title:           "Getting Started on LocalPro",
    slug:            "localpro-getting-started",
    description:     "A complete walkthrough of the LocalPro platform for new providers. Learn how to set up your profile, understand the dashboard, connect your payment method, and land your first job.",
    category:        "custom",
    price:           0,
    durationMinutes: 20,
    badgeSlug:       "localpro-onboarding",
    lessons: [
      {
        title:           "Welcome to LocalPro",
        content:         "# Welcome to LocalPro\n\nLocalPro connects skilled service providers with clients who need work done.\n\n## What you will learn\n- How the platform works end-to-end\n- Setting up a winning profile\n- Understanding your dashboard\n- How payments and escrow protect you",
        durationMinutes: 3,
        order:           0,
      },
      {
        title:           "Setting Up Your Provider Profile",
        content:         "# Setting Up Your Provider Profile\n\nYour profile is your storefront. Clients judge you before they ever message you.\n\n## Profile checklist\n- Upload a clear, professional profile photo\n- Write a bio that explains your experience and specialties\n- Add your skills (be specific)\n- Set your service areas\n- Add past work experience\n\n## Tips\n- Profiles with photos get 3x more views\n- List at least 5 specific skills\n- Mention your years of experience",
        durationMinutes: 5,
        order:           1,
      },
      {
        title:           "Navigating Your Dashboard",
        content:         "# Navigating Your Dashboard\n\n## Key sections\n\n### Jobs\nBrowse open jobs in your area. Use filters to find jobs that match your skills and budget.\n\n### Bids\nTrack all your active bids — accepted, pending, and rejected.\n\n### Bookings\nOnce a client accepts your bid, manage your schedule and mark jobs in-progress or completed.\n\n### Earnings\nView transaction history, pending payouts, and completed earnings.\n\n## Notifications\nKeep push notifications enabled so you never miss a new job or client message.",
        durationMinutes: 4,
        order:           2,
      },
      {
        title:           "KYC Verification — Why It Matters",
        content:         "# KYC Verification\n\nKYC (Know Your Customer) verification unlocks full bidding and payout features.\n\n## Why verify?\n- Clients see a Verified badge on your profile\n- You can withdraw earnings to your bank or e-wallet\n- Access higher-value job categories\n\n## How to verify\n1. Go to Profile > Verification\n2. Upload a valid government-issued ID\n3. Take a live selfie for liveness check\n4. Submit and wait 1-2 business days\n\nKeep your ID scan clear and fully visible. Blurry or cropped IDs will be rejected.",
        durationMinutes: 4,
        order:           3,
      },
      {
        title:           "Getting Your First Review",
        content:         "# Getting Your First Review\n\n## Why reviews matter\nProviders with at least one 5-star review receive 40% more job invites than those with none.\n\n## How to earn great reviews\n1. Communicate proactively — update the client before they have to ask\n2. Arrive on time — or notify in advance if delayed\n3. Clean up after yourself — leave the workspace tidy\n4. Ask politely after completing the job\n\n## After the job\nMark the job as completed in your app. This triggers the client review prompt.",
        durationMinutes: 4,
        order:           4,
      },
    ],
  },

  {
    title:           "How to Win Jobs on LocalPro",
    slug:            "localpro-winning-jobs",
    description:     "Learn the bidding strategy, proposal writing, and client communication skills that top-rated providers use to consistently win jobs on LocalPro.",
    category:        "custom",
    price:           0,
    durationMinutes: 25,
    badgeSlug:       "localpro-top-bidder",
    lessons: [
      {
        title:           "Understanding the Job Feed",
        content:         "# Understanding the Job Feed\n\nThe job feed shows all open jobs posted by clients in your service area.\n\n## How jobs are ranked\n- Newest first by default\n- Priority jobs appear at the top\n- Jobs with fewer bids are better opportunities\n\n## What to look for\n- Budget range vs. your typical rate\n- Job description quality (detailed = serious client)\n- Schedule date conflicts\n- Client history (how many completed jobs?)",
        durationMinutes: 5,
        order:           0,
      },
      {
        title:           "Writing a Winning Proposal",
        content:         "# Writing a Winning Proposal\n\nMost providers send generic one-liners. That is your opportunity.\n\n## The winning formula\n\n1. Reference the specific job — show you read the details\n2. State your relevant experience with numbers\n3. Explain your approach step by step\n4. Give a realistic timeline — do not overpromise\n5. End with a question about the job\n\nA question shows you are thinking about their problem, not just the money.",
        durationMinutes: 7,
        order:           1,
      },
      {
        title:           "Pricing Your Services",
        content:         "# Pricing Your Services\n\n## Do not race to the bottom\nThe cheapest bid rarely wins. Clients want confidence, not the lowest price.\n\n## How to price well\n- Research what similar jobs pay in your area\n- Factor in materials, travel time, and complexity\n- Add a 10-15% buffer for unexpected complications\n\n## When to bid below market\n- You need your first review\n- The job is close to home\n- The client has repeat work potential\n\n## Bid Credits\nEvery bid uses one bid credit. Bid wisely on jobs you genuinely want.",
        durationMinutes: 5,
        order:           2,
      },
      {
        title:           "Communicating With Clients",
        content:         "# Communicating With Clients\n\n## Response time is everything\nClients message multiple providers. The first to respond with a quality answer usually wins.\n\n## Golden rules\n1. Reply within 30 minutes when you are available\n2. Use full sentences — no slang or text speak\n3. Confirm details before showing up (address, time, scope)\n4. Update proactively: I am on my way, 10 minutes out\n\n## When things go wrong\n- Be honest and early\n- Offer a solution, not just an apology\n- Never go silent on a client",
        durationMinutes: 5,
        order:           3,
      },
      {
        title:           "Managing Your Availability",
        content:         "# Managing Your Availability\n\n## Set your status\n- Available — actively looking for work\n- Busy — taking jobs but calendar is filling\n- Unavailable — on break or fully booked\n\n## Why this matters\nIf your status is Available but you reject many job invites, your ranking in the feed drops.\n\n## Calendar discipline\n- Block out personal days in advance\n- Do not double-book\n- If you accept a job, honor it — cancellations hurt your rating",
        durationMinutes: 3,
        order:           4,
      },
    ],
  },

  {
    title:           "Escrow and Payments Explained",
    slug:            "localpro-escrow-payments",
    description:     "Understand exactly how LocalPro's escrow system protects both you and your clients — from job acceptance to payout to your e-wallet or bank account.",
    category:        "custom",
    price:           0,
    durationMinutes: 15,
    badgeSlug:       "localpro-payments-certified",
    lessons: [
      {
        title:           "What Is Escrow and Why It Protects You",
        content:         "# What Is Escrow?\n\nEscrow is a neutral holding system. When a client hires you, they deposit the job payment into escrow — held securely until the job is done.\n\n## Why this protects providers\n- You know the money exists before you start work\n- Clients cannot cancel and refuse to pay after you have done the job\n- Disputes are resolved fairly based on evidence\n\n## The payment flow\n1. Client accepts your bid\n2. Client funds escrow\n3. You do the work\n4. Job is marked complete\n5. Escrow is released to you minus platform fee\n6. Funds appear in your LocalPro wallet",
        durationMinutes: 5,
        order:           0,
      },
      {
        title:           "Platform Fees and Your Actual Earnings",
        content:         "# Platform Fees\n\nLocalPro charges a small service fee per transaction.\n\n| Fee | Who Pays | What It Covers |\n|-----|----------|----------------|\n| Platform service fee | Client | Platform maintenance, support |\n| Escrow fee | Client | Secure payment holding |\n| Processing fee | Client | Payment gateway costs |\n\n## What you receive\nYou receive the full agreed job amount minus the provider commission rate in your agreement.\n\nAlways confirm the final payout amount in the job detail screen before accepting.",
        durationMinutes: 4,
        order:           1,
      },
      {
        title:           "Withdrawing Your Earnings",
        content:         "# Withdrawing Your Earnings\n\n## How to withdraw\n1. Go to Wallet > Withdraw\n2. Choose your payout method (GCash, Maya, Bank Transfer)\n3. Enter the amount\n4. Confirm and wait for processing\n\n## Processing times\n- GCash / Maya: Usually within 24 hours\n- Bank Transfer: 1-3 business days\n\n## Tax reminder\nIn the Philippines, freelance income is taxable. Keep records of your earnings for BIR compliance.",
        durationMinutes: 3,
        order:           2,
      },
      {
        title:           "What Happens in a Dispute",
        content:         "# Disputes\n\n## When a dispute is filed\n1. Job is paused — no releases or refunds until resolved\n2. Both parties submit evidence (photos, messages, receipts)\n3. LocalPro admin reviews within 3-5 business days\n4. Admin decides: full release, partial release, or refund\n\n## How to protect yourself\n- Take before and after photos of every job\n- Communicate everything in-app — SMS conversations cannot be reviewed\n- Get client sign-off when the job is done\n\nIf a client disputes unfairly, your evidence wins. Document everything.",
        durationMinutes: 3,
        order:           3,
      },
    ],
  },

  {
    title:           "Building a 5-Star Provider Profile",
    slug:            "localpro-5star-profile",
    description:     "A practical guide to optimizing every part of your LocalPro profile to attract more clients, earn better reviews, and rank higher in search results.",
    category:        "custom",
    price:           0,
    durationMinutes: 18,
    badgeSlug:       "localpro-profile-pro",
    lessons: [
      {
        title:           "Profile Photo and First Impressions",
        content:         "# Profile Photo and First Impressions\n\nYour profile photo is the first thing clients notice — before they read a single word.\n\n## What makes a great provider photo\n- Face is clearly visible (no sunglasses or hats)\n- Neutral or outdoor background\n- Wearing work clothes or professional attire\n- Smiling, approachable expression\n- Good lighting — natural light works perfectly\n\n## What to avoid\n- Group photos\n- Dark or blurry images\n- Casual selfies at bad angles",
        durationMinutes: 3,
        order:           0,
      },
      {
        title:           "Writing Your Provider Bio",
        content:         "# Writing Your Provider Bio\n\n## Structure that works\n\nOpening — your specialty and years of experience\nExample: Licensed electrician with 8 years of residential experience in Metro Manila.\n\nWhat you do — specific services, not just categories\nExample: I specialize in panel upgrades, outlet installation, and troubleshooting electrical faults.\n\nWhy clients choose you\nExample: I arrive on time, explain everything in plain language, and always clean up before I leave.\n\nCall to action\nExample: Send me your job details and I will respond within the hour.\n\n## Length\nAim for 80-150 words. Long enough to convince, short enough to actually be read.",
        durationMinutes: 5,
        order:           1,
      },
      {
        title:           "Skills, Experience and Certifications",
        content:         "# Skills, Experience and Certifications\n\n## Skills\n- Add every specific skill you have — clients search by skill\n- Be precise: Inverter AC Installation beats just AC\n- Update your skills as you learn new ones\n\n## Work Experience\n- List previous employers or freelance work\n- Include job title, company, and duration\n- Informal experience counts (family business, apprenticeship)\n\n## Certifications\n- Upload any TESDA certificates or licenses\n- LocalPro Training badges appear automatically on your profile\n- Clients filter for certified providers — this is your competitive edge",
        durationMinutes: 5,
        order:           2,
      },
      {
        title:           "Managing Reviews and Your Rating",
        content:         "# Managing Reviews and Your Rating\n\n## How ratings are calculated\nYour rating is a weighted average of all client star ratings (1-5 stars).\n\n## How to raise a low rating\n- Consistently deliver excellent work going forward\n- A streak of 5-star jobs will quickly improve your average\n\n## Responding to reviews\n- You can respond to any review publicly\n- Keep responses professional — even to unfair reviews\n- A gracious response to a bad review impresses future clients\n\n## Reviews you can contest\nIf a review violates community guidelines (offensive, fake, unrelated), report it to support.",
        durationMinutes: 5,
        order:           3,
      },
    ],
  },
];

// ─── Section 2: Professional Skill Courses ────────────────────────────────────

const PROFESSIONAL_COURSES = [
  {
    title:           "Workplace Safety and First Aid Essentials",
    slug:            "workplace-safety-first-aid",
    description:     "Essential safety knowledge for any service provider — hazard identification, PPE use, emergency response, and basic first aid. Recommended before working in homes or commercial sites.",
    category:        "safety",
    price:           0,
    durationMinutes: 45,
    badgeSlug:       "safety-first-aid-certified",
    lessons: [
      {
        title:           "Hazard Identification and Risk Assessment",
        content:         "# Hazard Identification and Risk Assessment\n\n## Common job-site hazards\n- Electrical: exposed wires, wet conditions near outlets\n- Physical: sharp tools, heavy lifting, working at heights\n- Chemical: cleaning agents, paint fumes, solvents\n- Biological: mold, sewage, pest droppings\n\n## Risk assessment process\n1. Identify the hazard\n2. Who could be harmed?\n3. How likely and how severe?\n4. What controls reduce the risk?\n5. Review after the job\n\nAlways inspect the workspace before starting. Never assume it is safe.",
        durationMinutes: 8,
        order:           0,
      },
      {
        title:           "Personal Protective Equipment",
        content:         "# Personal Protective Equipment (PPE)\n\n| Job Type | Essential PPE |\n|----------|---------------|\n| Electrical work | Insulated gloves, rubber-soled shoes |\n| Plumbing | Waterproof gloves, safety goggles |\n| Cleaning | Chemical-resistant gloves, mask |\n| Carpentry | Safety glasses, steel-toe boots, ear protection |\n| Painting | Respirator, gloves, eye protection |\n| Roofing | Harness, hard hat, non-slip footwear |\n\n## PPE rules\n- Inspect PPE before each use\n- Replace damaged equipment immediately\n- PPE is the last line of defense — do not rely on it alone",
        durationMinutes: 7,
        order:           1,
      },
      {
        title:           "Basic First Aid for Cuts, Burns and Falls",
        content:         "# Basic First Aid\n\n## Cuts and Wounds\n1. Apply direct pressure with a clean cloth\n2. Elevate above the heart\n3. Clean with running water once bleeding slows\n4. Apply antibiotic ointment and cover\n5. Seek help if deep, will not stop bleeding, or shows infection signs\n\n## Burns\n- Minor burns: Cool under running water for 10 or more minutes. Do not use ice.\n- Serious burns: Cover loosely and go to ER immediately\n- Never pop blisters\n\n## Falls\n- Do not move someone who fell from height until paramedics arrive\n- Check for responsiveness and breathing\n- Call 911 for serious falls",
        durationMinutes: 8,
        order:           2,
      },
      {
        title:           "Fire Safety and Emergency Exits",
        content:         "# Fire Safety\n\n## Before starting any job\n- Identify fire exits in every building\n- Know where the fire extinguisher is located\n- Never block exits with tools or materials\n\n## If a fire starts\n1. Alert everyone in the area\n2. Call the fire department\n3. Use an extinguisher ONLY if the fire is small and you have a clear exit\n4. Evacuate — your life is worth more than the job\n\n## PASS technique\n- Pull the pin\n- Aim at the base of the fire\n- Squeeze the handle\n- Sweep side to side",
        durationMinutes: 7,
        order:           3,
      },
      {
        title:           "Heat Stress and Outdoor Work Safety",
        content:         "# Heat Stress and Outdoor Work Safety\n\n## Signs of heat exhaustion\n- Heavy sweating, weakness, cold or pale skin\n- Weak pulse, nausea, possible fainting\n\n## Signs of heatstroke (emergency)\n- Body temperature 39.4 C or higher\n- Hot, red, dry skin with no sweating\n- Rapid strong pulse and confusion\n\n## Prevention\n- Drink one cup of water every 20 minutes\n- Work in the shade when possible\n- Schedule heavy work for early morning or late afternoon\n- Take 10-minute rest breaks in shade every hour\n- Wear light-colored, loose clothing",
        durationMinutes: 8,
        order:           4,
      },
      {
        title:           "Electrical Safety for Non-Electricians",
        content:         "# Electrical Safety for Non-Electricians\n\n## The golden rules\n1. Never assume a wire is dead — test with a non-contact voltage tester\n2. Turn off the circuit breaker before working near wiring\n3. Never work on electrical systems in wet conditions\n4. Use insulated tools near electrical panels\n\n## Common dangers\n- Drilling into a wall without knowing where wires run\n- Overloading extension cords\n- Using damaged equipment\n\n## When to stop and call an electrician\n- Any exposed or sparking wires\n- Burning smell from outlets or panels\n- Flickering lights that return after resetting the breaker",
        durationMinutes: 7,
        order:           5,
      },
    ],
  },

  {
    title:           "Customer Service for Service Providers",
    slug:            "customer-service-for-providers",
    description:     "Learn the professional communication, conflict resolution, and client management skills that separate average providers from top-rated ones on LocalPro.",
    category:        "basic",
    price:           0,
    durationMinutes: 35,
    badgeSlug:       "customer-service-pro",
    lessons: [
      {
        title:           "Professional Communication Basics",
        content:         "# Professional Communication Basics\n\nClients rate providers on work quality AND how they were treated. Communication accounts for roughly 40% of your review score.\n\n## Written communication\n- Use full sentences — no slang\n- Respond within 30 minutes when active\n- Confirm details before showing up\n\n## On-site communication\n- Introduce yourself and shake hands\n- Explain what you are about to do before you do it\n- Ask before moving furniture or entering rooms\n- Give status updates at natural milestones",
        durationMinutes: 7,
        order:           0,
      },
      {
        title:           "Setting and Managing Expectations",
        content:         "# Setting and Managing Expectations\n\nThe number one cause of bad reviews is unmet expectations — not bad work.\n\n## How to set expectations right\n1. Be specific in your proposal — what exactly will you do?\n2. State what is NOT included: This quote covers labor only, materials are additional.\n3. Give a realistic time estimate with a 20% buffer\n4. Explain your process step by step\n\n## When something unexpected comes up\n- Stop and notify the client immediately\n- Explain clearly without jargon\n- Present options with cost implications\n- Let the client decide before proceeding",
        durationMinutes: 7,
        order:           1,
      },
      {
        title:           "Handling Complaints and Difficult Clients",
        content:         "# Handling Complaints and Difficult Clients\n\n## The HEARD method\n- Hear — let them finish without interrupting\n- Empathize — I understand why you are upset\n- Apologize — for the experience, even if not at fault\n- Resolve — offer a specific solution\n- Delight — go slightly beyond what was promised\n\n## Common scenarios\n\nWhen told the price is too high:\nWalk them through what is included so they can see the value.\n\nWhen a client is not satisfied:\nAsk them to show you specifically what concerns them so you can address it.",
        durationMinutes: 8,
        order:           2,
      },
      {
        title:           "After-Service Follow-Up",
        content:         "# After-Service Follow-Up\n\nMost providers never follow up. This alone sets you apart.\n\n## The 3-step follow-up\n\nStep 1 — End-of-job confirmation (same day)\nMessage: Just completed the job — everything is cleaned up. Let me know if you have any questions!\n\nStep 2 — Review request (24-48 hours later)\nMessage: Hoping everything is working well. If you were happy with the service, I would really appreciate a review!\n\nStep 3 — Seasonal check-in (1-2 months later)\nMessage: Any maintenance needs coming up? Happy to help again!\n\nKeep all follow-ups inside the LocalPro app.",
        durationMinutes: 6,
        order:           3,
      },
      {
        title:           "Building Long-Term Client Relationships",
        content:         "# Building Long-Term Client Relationships\n\nGetting a new client costs 5 times more effort than retaining an existing one.\n\n## How to become a client's go-to provider\n1. Remember details — note their building type, past issues, preferences\n2. Be reliable — show up when you say you will, every time\n3. Educate — share small useful tips related to their home\n4. Use seasonal reminders: Summer is coming — want to schedule your AC servicing?\n\n## The referral effect\nOne great client relationship can generate 3-5 new clients through word-of-mouth referrals.",
        durationMinutes: 7,
        order:           4,
      },
    ],
  },

  {
    title:           "Plumbing Fundamentals for Beginners",
    slug:            "plumbing-fundamentals",
    description:     "Build a solid foundation in residential plumbing — water systems, common fixtures, leak diagnosis, and basic repairs. Ideal for new plumbers and helpers.",
    category:        "basic",
    price:           199,
    durationMinutes: 60,
    badgeSlug:       "plumbing-fundamentals-badge",
    lessons: [
      {
        title:           "How Residential Water Systems Work",
        content:         "# How Residential Water Systems Work\n\n## The supply side\n- Water enters from the main supply line (street or deep well)\n- Passes through the main shutoff valve\n- Branches to cold water lines throughout the home\n- Hot water lines branch from the water heater\n\n## The drain side\n- Every fixture drains into a P-trap that holds water to block sewer gas\n- Drain lines rely on gravity\n- Vent pipes allow air in so drains flow freely\n\n## First thing on every job\nLocate the main shutoff valve before starting any plumbing work.",
        durationMinutes: 8,
        order:           0,
      },
      {
        title:           "Common Pipes and Fittings",
        content:         "# Common Pipes and Fittings\n\n| Type | Use | Notes |\n|------|-----|-------|\n| PVC | Drain and waste | Lightweight, cold water only |\n| CPVC | Hot and cold supply | Handles high temperatures |\n| PPR | Supply lines | Modern standard, heat-fused joints |\n| GI Galvanized Iron | Old supply | Prone to rust |\n| PEX | Flexible supply | Great for retrofits |\n\n## Common fittings\nElbow 45 and 90 degree, Tee, Coupling, Union, Reducer, Cap\n\n## Pipe sizing\n- Lavatory and shower supply: 1/2 inch\n- Main supply: 3/4 to 1 inch\n- Drain lines: 1.25 to 4 inches",
        durationMinutes: 10,
        order:           1,
      },
      {
        title:           "Diagnosing and Fixing Leaks",
        content:         "# Diagnosing and Fixing Leaks\n\n## Types of leaks\n1. Drip leaks — faucet or valve seat wear\n2. Joint leaks — failed thread seal or cracked fitting\n3. Pinhole leaks — pipe corrosion in GI pipe\n4. Slab leaks — underground supply lines (call a specialist)\n\n## Diagnosis steps\n1. Turn off all fixtures\n2. Check the water meter — is it still moving?\n3. Inspect visible pipes for moisture or staining\n4. Check under sinks and behind toilet tanks\n\n## Quick fixes\n- Dripping faucet: Replace the washer or cartridge\n- Leaking joint: Dry, apply Teflon tape, re-tighten",
        durationMinutes: 12,
        order:           2,
      },
      {
        title:           "Toilet Repair and Replacement",
        content:         "# Toilet Repair and Replacement\n\n| Problem | Likely Cause | Fix |\n|---------|-------------|-----|\n| Running toilet | Faulty flapper | Replace flapper |\n| Weak flush | Low water level | Adjust fill valve |\n| Rocking toilet | Failed wax ring | Replace wax ring |\n| Will not flush | Clogged drain | Plunge or snake |\n\n## Replacing a toilet\n1. Shut off water supply\n2. Flush and bail remaining water\n3. Disconnect supply line\n4. Remove base bolts and lift toilet straight up\n5. Scrape old wax ring and install new one\n6. Set new toilet and press firmly down\n7. Reinstall bolts, reconnect supply, test for leaks",
        durationMinutes: 10,
        order:           3,
      },
      {
        title:           "Drain Cleaning Methods",
        content:         "# Drain Cleaning Methods\n\n## From least to most invasive\n1. Boiling water — minor grease and soap clogs\n2. Plunger — cup plunger for sinks, flange plunger for toilets\n3. Drain snake — 3 to 6 meter hand crank auger\n4. Chemical drain cleaner — use sparingly, can damage older pipes\n5. Hydro jetting — high-pressure water for serious blockages\n\n## Prevention tips\n- Install drain strainers on all sinks and showers\n- Never pour cooking oil down the drain\n- Run hot water for 30 seconds after each use",
        durationMinutes: 10,
        order:           4,
      },
      {
        title:           "Water Heater Basics and Installation",
        content:         "# Water Heater Basics and Installation\n\n## Types\n- Instant or tankless — heats on demand, energy efficient\n- Storage tank — heats and stores, slower recovery\n- Solar — eco-friendly, requires roof space\n\n## Installation steps\n1. Shut off water and power or gas\n2. Drain and disconnect old unit\n3. Install new unit with proper clearance\n4. Connect supply lines and power or gas per manufacturer specs\n5. Turn on water supply and check for leaks\n6. Power on and test hot water at nearest tap\n\n## Safety for gas heaters\nTest all connections with soapy water for leaks before powering on.",
        durationMinutes: 10,
        order:           5,
      },
    ],
  },

  {
    title:           "Electrical Safety Certification",
    slug:            "electrical-safety-certification",
    description:     "Comprehensive electrical safety training: safe work practices, lockout/tagout procedures, Philippine Electrical Code wire color standards, and fault diagnosis. Recommended for all electricians on LocalPro.",
    category:        "safety",
    price:           299,
    durationMinutes: 75,
    badgeSlug:       "electrical-safety-certified",
    lessons: [
      {
        title:           "Understanding Voltage, Current and Circuits",
        content:         "# Understanding Voltage, Current and Circuits\n\n## The basics\n- Voltage (V) — electrical pressure. Philippine homes use 230V.\n- Current (A) — flow of electrons\n- Resistance (ohm) — opposition to current\n- Ohm's Law: V equals I times R\n\n## Philippine standard\n- Residential: 230V single-phase\n- Commercial: 230V or 400V three-phase\n\n## Dangerous current levels\n- 10mA can cause muscle paralysis\n- 50mA can cause cardiac arrest\n\nTreat all wiring as live until verified dead with a tester.",
        durationMinutes: 10,
        order:           0,
      },
      {
        title:           "Lockout Tagout LOTO Procedures",
        content:         "# Lockout Tagout (LOTO)\n\nPrevents unexpected re-energization while you are working on a circuit.\n\n## Steps\n1. Identify all energy sources — a circuit may have multiple breakers\n2. Notify all affected people\n3. Shut off equipment\n4. Isolate energy source (turn off the breaker)\n5. Lock the breaker with a personal padlock\n6. Tag it: DO NOT OPERATE - your name - date\n7. Verify dead with a non-contact voltage tester\n8. Work safely\n9. Remove lock and tag only when work is complete\n\nNever rely on someone else's word that a circuit is dead. Verify it yourself.",
        durationMinutes: 12,
        order:           1,
      },
      {
        title:           "Philippine Electrical Code Wire Colors",
        content:         "# Wire Color Coding — PEC Standard\n\n| Color | 3-Phase Use | Single-Phase Use |\n|-------|------------|------------------|\n| Black | Phase A | Line (Hot) |\n| Red | Phase B | — |\n| Blue | Phase C | — |\n| Green or Yellow | Ground | Ground |\n| White or Gray | Neutral | Neutral |\n\n## Wire sizing guide\n- No. 14 AWG — 15A circuits\n- No. 12 AWG — 20A circuits\n- No. 10 AWG — 30A circuits\n\nOversized breakers on undersized wire is a fire hazard. A 20A breaker on No. 14 wire is dangerous.",
        durationMinutes: 13,
        order:           2,
      },
      {
        title:           "Common Wiring Faults and Diagnosis",
        content:         "# Common Wiring Faults\n\n| Fault | Symptom | Diagnostic Tool |\n|-------|---------|------------------|\n| Open circuit | No power to load | Continuity tester |\n| Short circuit | Breaker trips immediately | Insulation tester |\n| Ground fault | GFCI trips, tingling feeling | GFCI tester |\n| High resistance | Heat at connection, voltage drop | Clamp meter |\n| Overloaded circuit | Trips under load | Clamp meter for current |\n\n## Systematic troubleshooting\n1. Check the panel — are any breakers tripped?\n2. Reset; does it trip again immediately?\n3. Test outlets with a plug-in tester\n4. Use a multimeter to trace toward the source\n\nWork from safe to dangerous — check the panel before opening junction boxes.",
        durationMinutes: 15,
        order:           3,
      },
      {
        title:           "Safe Outlet and Switch Installation",
        content:         "# Outlet and Switch Installation\n\n## Before you start\n- Complete LOTO on the circuit\n- Verify dead with a voltage tester at the outlet location\n\n## Outlet wiring\n1. Ground wire (green or bare) to green screw\n2. Neutral (white) to silver screw\n3. Hot (black) to brass screw\n4. Push neatly into box and install cover plate\n5. Restore power and test with an outlet tester\n\n## GFCI outlets are required\n- Within 1 meter of any water source\n- Outdoor outlets\n- Garages\n\n## Switch wiring\nSwitches are wired in series with the hot wire only. Neutral passes through to the load without connecting to the switch.",
        durationMinutes: 15,
        order:           4,
      },
      {
        title:           "Panel Board and Breaker Safety",
        content:         "# Panel Board Safety\n\n## Warning signs of a dangerous panel\n- Double-tapped breakers (two wires on one terminal)\n- Signs of burning, heat discoloration, or melted plastic\n- Rust or moisture inside the panel\n- Oversized breakers such as 20A on No. 14 wire\n- Unlabeled circuits\n\n## Safe working practices\n- Never work on the panel while the utility side is live\n- Always use insulated tools\n- Stand to the side when re-energizing (arc flash protection)\n- Label every circuit you work on\n\nBurn marks or melted plastic means recommend immediate panel replacement. Do not proceed with other work.",
        durationMinutes: 10,
        order:           5,
      },
    ],
  },

  {
    title:           "Professional Home Cleaning Standards",
    slug:            "professional-home-cleaning",
    description:     "Master the techniques, products, and workflow used by professional cleaning services. Covers room-by-room standards, deep cleaning methods, and specialty surface care.",
    category:        "basic",
    price:           149,
    durationMinutes: 40,
    badgeSlug:       "professional-cleaner-certified",
    lessons: [
      {
        title:           "Cleaning Solutions and Product Safety",
        content:         "# Cleaning Solutions and Product Safety\n\n| Product | Use | Do NOT mix with |\n|---------|-----|-----------------|\n| Bleach | Disinfection and mold | Ammonia and vinegar |\n| Ammonia-based cleaner | Glass and mirrors | Bleach |\n| Vinegar | Mineral deposits | Bleach |\n| Baking soda | Gentle abrasive | Vinegar (wasted reaction) |\n| Hydrogen peroxide | Sanitizing and stains | Vinegar |\n\n## Safety rules\n- Always wear gloves\n- Open windows to ventilate the space\n- Never mix bleach with anything except water\n\n## pH basics\n- Acidic products like vinegar remove mineral deposits and rust\n- Alkaline products like bleach and degreasers remove grease and kill bacteria",
        durationMinutes: 8,
        order:           0,
      },
      {
        title:           "The Professional Cleaning Workflow",
        content:         "# The Professional Cleaning Workflow\n\n## Golden rules\n1. Top to bottom — dust falls, always clean ceilings before floors\n2. Dry before wet — dust and sweep before mopping\n3. Let products dwell — spray, wait, then wipe\n\n## Standard room sequence\n1. Declutter and remove items from surfaces\n2. Dust: ceiling fans, light fixtures, shelves, window sills\n3. Clean windows and mirrors\n4. Wipe surfaces and appliances\n5. Disinfect high-touch points (switches, handles, remotes)\n6. Vacuum or sweep\n7. Mop floor working backwards toward the door\n8. Final visual check before calling the client",
        durationMinutes: 8,
        order:           1,
      },
      {
        title:           "Bathroom Deep Cleaning",
        content:         "# Bathroom Deep Cleaning\n\n## Apply and dwell first\nApply toilet cleaner, tile spray, and shower cleaner before touching anything else. Let them work while you handle other areas.\n\n## Order of operations\n1. Apply toilet bowl cleaner inside the bowl\n2. Spray tiles and shower or tub walls\n3. Clean mirror and medicine cabinet exterior\n4. Wipe counter and sink\n5. Scrub toilet: tank lid, tank exterior, seat, bowl rim, base\n6. Flush bowl after scrubbing\n7. Scrub shower or tub and clean drain screen\n8. Wipe all fixtures until they shine\n9. Mop floor working backwards toward door\n\n## Mold and mildew\nUse bleach solution at 1 to 10 ratio, let dwell 5 minutes, scrub with stiff brush. Wear a mask.",
        durationMinutes: 8,
        order:           2,
      },
      {
        title:           "Specialty Surfaces Marble Wood and Stainless",
        content:         "# Specialty Surfaces\n\n## Marble and Natural Stone\n- NEVER use vinegar or citrus cleaners — permanently etch the surface\n- Use pH-neutral stone cleaner only\n- Dry immediately — no standing water allowed\n\n## Hardwood Floors\n- Vacuum with a soft brush attachment first\n- Use a barely-damp mop — never a wet mop\n- Use only wood-specific floor cleaner\n\n## Stainless Steel\n- Always wipe WITH the grain (follow the brush lines)\n- A few drops of mineral oil on microfiber for shine\n- Never use steel wool — scratches permanently\n\n## Glass Cooktops\n- Let cool completely before cleaning\n- Baking soda paste plus plastic scraper for burnt food\n- Glass cleaner for the final shine",
        durationMinutes: 8,
        order:           3,
      },
      {
        title:           "End of Clean Quality Check",
        content:         "# End of Clean Quality Check\n\n## Walk-through checklist before calling the client\n- Floors: no streaks, no debris in corners\n- Mirrors and glass: streak-free\n- Surfaces: dust-free\n- Trash: emptied and relined\n- Fixtures: no water spots\n- High-touch points: disinfected\n- Scent: fresh and not overpowering\n\n## Client handover\n1. Walk through the job with the client present\n2. Invite them to point out anything to re-do\n3. Address it immediately — never argue\n4. Follow up via app message asking for a review",
        durationMinutes: 8,
        order:           4,
      },
    ],
  },

  {
    title:           "Running Your Service Business Professionally",
    slug:            "running-your-service-business",
    description:     "Level up from solo provider to a professional service business. Covers pricing strategy, record-keeping, Philippine tax obligations, branding, and scaling with a team.",
    category:        "advanced",
    price:           499,
    durationMinutes: 50,
    badgeSlug:       "service-business-professional",
    lessons: [
      {
        title:           "Setting Your Rates for Profitability",
        content:         "# Setting Your Rates for Profitability\n\n## The cost-plus method\n1. Calculate your monthly fixed costs: tools, transport, phone plan\n2. Decide how many billable days per month (for example 22)\n3. Divide: costs divided by 22 equals your daily break-even\n4. Add your desired profit margin (for example 40%)\n\n## Market research\n- Check competitor rates on LocalPro for similar jobs\n- Certified providers with great reviews typically command 20-30% more\n\n## Value-based pricing\nFor premium clients, price based on the value of the outcome — not just the hours you spend.",
        durationMinutes: 10,
        order:           0,
      },
      {
        title:           "Basic Record-Keeping and Budgeting",
        content:         "# Basic Record-Keeping\n\n## What to track per job\n- Date, client, service performed, amount charged, amount received, expenses, net profit\n\n## Simple Google Sheets setup\nColumns: Date | Client | Service | Invoice | Received | Expenses | Net\n\n## Why this matters\n1. BIR requires records for tax filing\n2. You can see which job types are actually profitable\n3. Proof of income for loans or visa applications\n\n## Free tools\n- Google Sheets\n- Wave Accounting (built for freelancers)\n- GCash Business (automatically tracks transactions)",
        durationMinutes: 8,
        order:           1,
      },
      {
        title:           "Tax Obligations for Freelance Providers",
        content:         "# Tax Obligations in the Philippines\n\n## BIR Registration steps\n1. Register as self-employed using BIR Form 1901\n2. Obtain your Certificate of Registration\n3. Register your books of accounts\n\n## What to pay\n- Income tax: graduated rates OR flat 8% on gross income above 250,000 pesos\n- Percentage tax: 3% of gross receipts when using graduated rates\n\n## The 8% flat rate option\n- Simplest option for most solo providers\n- Pay 8% of all income above 250,000 pesos annually\n- No quarterly percentage tax required\n- File once a year using BIR Form 1701A\n\nThis is general guidance, not legal or tax advice. Consult a CPA for your specific situation.",
        durationMinutes: 10,
        order:           2,
      },
      {
        title:           "Building a Brand People Remember",
        content:         "# Building a Brand\n\n## You are the brand\nYour uniform, how you answer the phone, how clean you leave a job site — all of it communicates your brand.\n\n## Low-cost branding actions\n- Branded shirt with your name or trade\n- Business cards to hand out after every completed job\n- Consistent profile photo across all platforms\n- A memorable tagline: Tama sa oras, tama ang trabaho\n\n## Long-term brand building\n- Specialize: become known as the AC specialist or tile expert in your area\n- Brand is built by consistent delivery, not one flashy moment\n- One great job shared in a neighborhood group can bring 5 new clients",
        durationMinutes: 10,
        order:           3,
      },
      {
        title:           "Scaling by Hiring and Managing a Team",
        content:         "# Scaling With a Team\n\n## When to hire your first helper\n- You are regularly turning down jobs due to capacity\n- Your earnings have plateaued despite full days\n- You have recurring clients who need more than you can deliver alone\n\n## Starting with a helper\n1. Post in local Facebook groups or community networks\n2. Run a 2 to 4 week trial on smaller, lower-risk jobs\n3. Train them on your standards before they work with clients independently\n\n## Managing quality\n- Create a job checklist for every service type\n- Do periodic spot checks on their work\n- Your name is on every job they do — it must meet your standard\n\n## Platform note\nOn LocalPro, only verified providers can bid on jobs. Staff either work under your account or register their own.",
        durationMinutes: 12,
        order:           4,
      },
    ],
  },
];

const ALL_COURSES = [...PLATFORM_GUIDES, ...PROFESSIONAL_COURSES];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.\n");

  const adminUser = await User.findOne({ role: "admin" }).select("_id").lean();
  if (!adminUser) {
    console.error("No admin user found. Create an admin account first, then re-run this script.");
    process.exit(1);
  }
  const createdBy = adminUser._id;
  console.log("Using admin user " + createdBy + " as course author.\n");

  if (WIPE) {
    const { deletedCount } = await TrainingCourse.deleteMany({});
    console.log("Wiped " + deletedCount + " existing course(s).\n");
  }

  let inserted = 0;
  let skipped  = 0;
  let updated  = 0;

  for (const course of ALL_COURSES) {
    const exists = await TrainingCourse.findOne({ slug: course.slug }).lean();

    if (exists) {
      if (FORCE) {
        await TrainingCourse.updateOne(
          { slug: course.slug },
          { $set: { ...course, isPublished: PUBLISH, createdBy } }
        );
        console.log("  Updated:  " + course.title);
        updated++;
      } else {
        console.log("  Skipped:  " + course.title);
        skipped++;
      }
    } else {
      await TrainingCourse.create({ ...course, isPublished: PUBLISH, createdBy });
      console.log("  Inserted: " + course.title);
      inserted++;
    }
  }

  console.log("\nDone.\n");
  console.log("  Inserted : " + inserted);
  console.log("  Updated  : " + updated);
  console.log("  Skipped  : " + skipped);
  console.log("  Total    : " + ALL_COURSES.length);

  if (!PUBLISH) {
    console.log("\n  Courses were created as drafts.");
    console.log("  Re-run with --publish to auto-publish all.");
    console.log("  Or toggle individually in the admin panel at /admin/courses.");
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("Seed error:", err.message);
    mongoose.disconnect();
    process.exit(1);
  });
