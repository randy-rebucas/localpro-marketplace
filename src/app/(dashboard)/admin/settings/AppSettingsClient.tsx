"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gift,
  LayoutDashboard,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Settings2,
  Shield,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

type AppSettings = Record<string, unknown>;

// ─── Ad Slide types ──────────────────────────────────────────────────────────
type AdTheme = "blue" | "emerald" | "violet" | "amber" | "cyan" | "yellow" | "teal" | "indigo" | "rose" | "slate";

interface ManagedAd {
  id: string;
  eyebrow: string;
  headline: string;
  sub: string;
  cta?: string;
  url?: string;
  theme: AdTheme;
}

const THEME_PRESETS: Record<AdTheme, { gradient: string; accent: string; border: string; dot: string }> = {
  blue:    { gradient: "from-blue-900 via-[#0d2340] to-[#1a3050]",    accent: "text-blue-300",    border: "border-blue-400/30",    dot: "bg-blue-400" },
  emerald: { gradient: "from-emerald-900 via-[#0d2340] to-[#1a3050]", accent: "text-emerald-300", border: "border-emerald-400/30", dot: "bg-emerald-400" },
  violet:  { gradient: "from-violet-900 via-[#0d2340] to-[#1a3050]",  accent: "text-violet-300",  border: "border-violet-400/30",  dot: "bg-violet-400" },
  amber:   { gradient: "from-amber-900 via-[#0d2340] to-[#1a3050]",   accent: "text-amber-300",   border: "border-amber-400/30",   dot: "bg-amber-400" },
  cyan:    { gradient: "from-cyan-900 via-[#0d2340] to-[#1a3050]",    accent: "text-cyan-300",    border: "border-cyan-400/30",    dot: "bg-cyan-400" },
  yellow:  { gradient: "from-yellow-900 via-[#0d2340] to-[#1a3050]",  accent: "text-yellow-300",  border: "border-yellow-400/30",  dot: "bg-yellow-400" },
  teal:    { gradient: "from-teal-900 via-[#0d2340] to-[#1a3050]",    accent: "text-teal-300",    border: "border-teal-400/30",    dot: "bg-teal-400" },
  indigo:  { gradient: "from-indigo-900 via-[#0d2340] to-[#1a3050]",  accent: "text-indigo-300",  border: "border-indigo-400/30",  dot: "bg-indigo-400" },
  rose:    { gradient: "from-rose-900 via-[#0d2340] to-[#1a3050]",    accent: "text-rose-300",    border: "border-rose-400/30",    dot: "bg-rose-400" },
  slate:   { gradient: "from-slate-800 via-[#0d2340] to-[#1a3050]",   accent: "text-slate-300",   border: "border-slate-400/30",   dot: "bg-slate-400" },
};

const DEFAULT_ADS: ManagedAd[] = [
  { id: "provider-signup", theme: "blue",    eyebrow: "🚀  Join the Platform",        headline: "Become a Verified Provider",           sub: "Set your own rates. Get paid securely via escrow. Thousands of clients are waiting for skilled workers like you.", cta: "Sign up free →", url: "/register?role=provider" },
  { id: "client-post",     theme: "emerald", eyebrow: "📋  Need Work Done?",           headline: "Post a Job in 60 Seconds",             sub: "Describe your task, set your budget, and get quotes from vetted local providers — no upfront cost, no hidden fees.", cta: "Post a job →", url: "/client/post-job" },
  { id: "escrow",          theme: "violet",  eyebrow: "🔒  Safe & Secure",             headline: "Every Payment is Escrow-Protected",      sub: "Your money is held safely until the job is complete and you're satisfied. No more payment disputes or ghosted workers.", cta: "Learn more →", url: "/how-it-works" },
  { id: "ratings",         theme: "amber",   eyebrow: "⭐  Quality Guaranteed",        headline: "Hire Only Rated & Verified Providers",  sub: "Every provider on LocalPro has verified identity, reviewed work history, and a public rating you can trust.", cta: "Browse providers →", url: "/providers" },
  { id: "plumbing",        theme: "cyan",    eyebrow: "🔧  Plumbing Services",         headline: "Leaky Faucet? Clogged Drain?",          sub: "Find trusted plumbers in Ormoc City available today. Fixed-price quotes, no surprise charges, guaranteed workmanship.", cta: "Find a plumber →", url: "/providers?category=Plumbing" },
  { id: "electrical",      theme: "yellow",  eyebrow: "⚡  Electrical Services",        headline: "Safe, Licensed Electricians Near You",  sub: "Wiring, panel upgrades, outlets, and lighting — LocalPro electricians are PRC-licensed and background-checked.", cta: "Book an electrician →", url: "/providers?category=Electrical" },
  { id: "cleaning",        theme: "teal",    eyebrow: "🧹  Cleaning Services",          headline: "Spotless Home, Stress-Free Life",        sub: "Professional deep cleaning, regular housekeeping, and move-in/move-out cleaning. Book in minutes, pay after.", cta: "Book a cleaner →", url: "/providers?category=Cleaning" },
  { id: "peso-jobs",       theme: "indigo",  eyebrow: "🏛️  PESO Job Listings",         headline: "Government & LGU Jobs Available Now",   sub: "Browse PESO-posted employment opportunities, government programs, and LGU-funded livelihood projects in Ormoc City.", cta: "View PESO jobs →", url: "/jobs?source=peso" },
  { id: "top-earners",     theme: "rose",    eyebrow: "💰  Top Provider Earnings",      headline: "Skilled Workers Earn ₱18,000+/Month",   sub: "Our top-rated providers in Ormoc are earning more than minimum wage — on their own schedule, with zero boss.", cta: "Start earning →", url: "/register?role=provider" },
  { id: "business",        theme: "slate",   eyebrow: "🏢  For Businesses",             headline: "Hire at Scale with a Business Account", sub: "Property managers, BPOs, and local businesses use LocalPro to manage recurring service jobs with one team dashboard.", cta: "Get a business account →", url: "/register?role=client&plan=business" },
];

const DEFAULTS: AppSettings = {
  // Platform
  "platform.maintenanceMode": false,
  "platform.newRegistrations": true,
  "platform.kycRequired": false,
  // Job Board
  "board.ads": DEFAULT_ADS,
  "board.adsEnabled": true,
  "board.lguFilterEnabled": true,
  "board.activityFeed": false,
  "board.earningsWidget": false,
  "board.categoryDemand": false,
  "board.achievementsWidget": false,
  "board.urgentJobs": false,
  "board.trainingCta": false,
  "board.marketplaceStats": false,
  "board.priceGuide": false,
  "board.businessCta": false,
  "board.partners": false,
  "board.jobAlerts": false,
  // Payments
  "payments.baseCommissionRate": 15,
  "payments.highCommissionRate": 20,
  "payments.minJobBudget": 500,
  "payments.minPayoutAmount": 100,
  "payments.escrowServiceFeeRate": 2,
  "payments.processingFeeRate": 2,
  "payments.withdrawalFeeBank": 20,
  "payments.withdrawalFeeGcash": 15,
  "payments.urgencyFeeSameDay": 50,
  "payments.urgencyFeeRush": 100,
  "payments.platformServiceFeeRate": 5,
  "payments.featuredListingFeaturedProvider": 199,
  "payments.featuredListingTopSearch": 299,
  "payments.featuredListingHomepage": 499,
  // Lead fee
  "payments.leadFeeEnabled": false,
  "payments.leadFeeMode": "pay_per_lead",
  "payments.leadFeePayPerLead": 30,
  "payments.leadFeeBidCreditPrice": 10,
  "payments.leadFeeSubscriptionMonthly": 499,
  // Limits
  "limits.maxQuotesPerJob": 5,
  "limits.quoteValidityDays": 7,
  "limits.maxActiveJobsPerClient": 10,
  "limits.escrowAutoReleaseDays": 7,
  "limits.jobExpiryDays": 30,
  "limits.disputeEscalationDays": 5,
  "limits.consultationExpiryDays": 7,
  "limits.dailyConsultationLimitClient": 10,
  "limits.dailyConsultationLimitProvider": 5,
  // Loyalty
  "loyalty.pointsPerPeso": 0.1,
  "loyalty.pesoPerHundredPoints": 10,
  "loyalty.minRedemptionPoints": 500,
  "loyalty.firstJobBonusPoints": 100,
  "loyalty.tierThresholdSilver": 500,
  "loyalty.tierThresholdGold": 2000,
  "loyalty.tierThresholdPlatinum": 5000,
  // Fraud & Security
  "fraud.jobFlagScore": 50,
  "fraud.jobBlockScore": 80,
  "fraud.highBudgetThreshold": 5000,
};

type SettingType = "boolean" | "number" | "select";

interface SettingMeta {
  label: string;
  description: string;
  type: SettingType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

type TabId = "general" | "board" | "payments" | "limits" | "loyalty" | "fraud";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  keys: string[];
}

const SETTING_META: Record<string, SettingMeta> = {
  // ── General ─────────────────────────────────────────────────────────────────
  "platform.maintenanceMode": {
    label: "Maintenance Mode",
    description:
      "Take the entire platform offline for maintenance. Authenticated admins can still access the dashboard.",
    type: "boolean",
  },
  "platform.newRegistrations": {
    label: "Allow New Registrations",
    description:
      "Enable sign-up for new clients and providers. Disable during fraud incidents or platform overload.",
    type: "boolean",
  },
  "platform.kycRequired": {
    label: "Require KYC to Post Jobs",
    description:
      "Clients must complete identity verification before posting a job. Reduces fraudulent postings.",
    type: "boolean",
  },
  // ── Job Board ────────────────────────────────────────────────────────────────
  "board.adsEnabled": {
    label: "Ad Flash Enabled",
    description:
      "Enable the fullscreen ad overlay that cycles through promotional slides on the public job board. Disable to suppress all ads without deleting them.",
    type: "boolean",
  },
  "board.lguFilterEnabled": {
    label: "LGU Filter (Ormoc Only)",
    description:
      "When enabled, the public job board only displays jobs posted within Ormoc City (municipality / LGU level). Disable to show jobs from all locations nationwide.",
    type: "boolean",
  },
  "board.activityFeed": {
    label: "Activity Feed",
    description:
      "Show a live 'Marketplace Activity' feed on the public job board. Polls every 12 seconds.",
    type: "boolean",
  },
  "board.earningsWidget": {
    label: "Estimated Earnings Widget",
    description:
      "Show a 'How Much Can You Earn?' widget. Cycles through service examples every 60 seconds.",
    type: "boolean",
  },
  "board.categoryDemand": {
    label: "Category Demand Widget",
    description:
      "Show a 'Most Requested Today' bar chart. Refreshes every 60 seconds.",
    type: "boolean",
  },
  "board.achievementsWidget": {
    label: "Provider Achievements Widget",
    description:
      "Highlight top providers with badges (Fast Responder, Top Rated, 10 Jobs Done). Flashes every 60 seconds.",
    type: "boolean",
  },
  "board.urgentJobs": {
    label: "Featured Jobs Strip",
    description:
      "Show a 'Featured Jobs' strip highlighting the 2 highest-budget open jobs.",
    type: "boolean",
  },
  "board.trainingCta": {
    label: "Training CTA",
    description:
      "Show an 'Upskill & Earn More' training call-to-action card at the bottom of the right panel.",
    type: "boolean",
  },
  "board.marketplaceStats": {
    label: "Marketplace Stats",
    description:
      "Show the Marketplace Stats section (open jobs, completed, top providers) in the bottom strip.",
    type: "boolean",
  },
  "board.priceGuide": {
    label: "Service Price Guide",
    description:
      "Show average job prices per service in the bottom strip.",
    type: "boolean",
  },
  "board.businessCta": {
    label: "Business Client CTA",
    description:
      "Show the 'Post a Job on LocalPro' call-to-action in the bottom strip.",
    type: "boolean",
  },
  "board.partners": {
    label: "Payment Partners",
    description:
      "Show the payment partners section (GCash, Maya, PayMongo, etc.) in the bottom strip.",
    type: "boolean",
  },
  "board.jobAlerts": {
    label: "Job Alerts QR",
    description:
      "Show the Job Alerts QR code section so providers can subscribe to push notifications.",
    type: "boolean",
  },
  // ── Payments ─────────────────────────────────────────────────────────────────
  "payments.baseCommissionRate": {
    label: "Base Commission Rate",
    description:
      "Platform fee applied to standard service categories (e.g. Cleaning, Plumbing).",
    type: "number",
    unit: "%",
    min: 0,
    max: 50,
    step: 0.5,
  },
  "payments.highCommissionRate": {
    label: "High-Value Commission Rate",
    description:
      "Platform fee for specialized or high-value categories (e.g. HVAC, Roofing, Major Renovations).",
    type: "number",
    unit: "%",
    min: 0,
    max: 50,
    step: 0.5,
  },
  "payments.minJobBudget": {
    label: "Minimum Job Budget",
    description:
      "Clients must set a job budget of at least this amount when posting.",
    type: "number",
    unit: "₱",
    min: 0,
    step: 50,
  },
  "payments.minPayoutAmount": {
    label: "Minimum Payout Amount",
    description:
      "Providers must accumulate at least this balance before requesting a wallet withdrawal.",
    type: "number",
    unit: "₱",
    min: 0,
    step: 50,
  },
  "payments.escrowServiceFeeRate": {
    label: "Escrow Service Fee",
    description:
      "Non-refundable fee charged to the client on top of the service price when funding escrow. Recognised as platform revenue at the moment of payment.",
    type: "number",
    unit: "%",
    min: 0,
    max: 10,
    step: 0.5,
  },
  "payments.processingFeeRate": {
    label: "Payment Processing Fee",
    description:
      "Non-refundable fee passed to the client to offset gateway processing costs (GCash, PayMongo, etc.). Recognised as platform revenue at the moment of payment.",
    type: "number",
    unit: "%",
    min: 0,
    max: 10,
    step: 0.5,
  },
  "payments.withdrawalFeeBank": {
    label: "Withdrawal Fee (Bank Transfer)",
    description:
      "Flat fee (PHP) deducted from the gross payout amount for standard bank transfer withdrawals. Non-refundable and recognised as revenue immediately on request.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 100,
    step: 1,
  },
  "payments.withdrawalFeeGcash": {
    label: "Withdrawal Fee (GCash / Maya)",
    description:
      "Flat fee (PHP) deducted from the gross payout amount for GCash / Maya withdrawals. Non-refundable and recognised as revenue immediately on request.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 100,
    step: 1,
  },
  "payments.urgencyFeeSameDay": {
    label: "Urgency Fee (Same Day)",
    description:
      "Flat fee (PHP) charged to the client when they select Same Day booking urgency. Non-refundable and recognised as revenue at escrow funding.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 500,
    step: 5,
  },
  "payments.urgencyFeeRush": {
    label: "Urgency Fee (2-Hour Rush)",
    description:
      "Flat fee (PHP) charged to the client when they select 2-Hour Rush booking urgency. Non-refundable and recognised as revenue at escrow funding.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 500,
    step: 5,
  },
  "payments.platformServiceFeeRate": {
    label: "Platform Service Fee (Client)",
    description:
      "Client-side service fee charged on top of the service price at checkout. Recognised as non-refundable platform revenue at the moment of payment. Set to 0 to disable. This fee is applied in addition to the provider commission — enabling a dual-sided revenue model.",
    type: "number",
    unit: "%",
    min: 0,
    max: 15,
    step: 0.5,
  },
  "payments.featuredListingFeaturedProvider": {
    label: "Featured Provider Boost (₱/week)",
    description:
      "Weekly price (PHP) for the 'Featured Provider' boost tier. Provider appears at the top of marketplace search results with a highlighted badge.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 2000,
    step: 10,
  },
  "payments.featuredListingTopSearch": {
    label: "Top Search Placement Boost (₱/week)",
    description:
      "Weekly price (PHP) for the 'Top Search Placement' boost tier. Provider is pinned at the top of category-filtered search pages.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 2000,
    step: 10,
  },
  "payments.featuredListingHomepage": {
    label: "Homepage Highlight Boost (₱/week)",
    description:
      "Weekly price (PHP) for the 'Homepage Highlight' boost tier. Provider card is shown in the premium strip on the client homepage.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 2000,
    step: 10,
  },
  // ── Lead Fee ───────────────────────────────────────────────────────────────
  "payments.leadFeeEnabled": {
    label: "Lead Fee Enabled",
    description:
      "Master switch for the lead fee system. When OFF, all providers can submit quotes for free regardless of other lead fee settings.",
    type: "boolean",
  },
  "payments.leadFeeMode": {
    label: "Lead Fee Mode",
    description:
      "Controls which charging model is active. pay_per_lead debits the provider wallet per quote. bid_credits requires pre-purchased credit tokens. subscription grants unlimited quotes to monthly subscribers.",
    type: "select",
    options: [
      { value: "pay_per_lead", label: "Pay per lead (wallet debit per quote)" },
      { value: "bid_credits",  label: "Bid credits (token per quote)" },
      { value: "subscription", label: "Monthly subscription (unlimited quotes)" },
    ],
  },
  "payments.leadFeePayPerLead": {
    label: "Pay-per-Lead Fee (₱/quote)",
    description:
      "Amount (PHP) deducted from the provider\'s wallet each time they submit a quote when mode is \'pay_per_lead\'.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 500,
    step: 5,
  },
  "payments.leadFeeBidCreditPrice": {
    label: "Bid Credit Price (₱/token)",
    description:
      "Cost per bid credit token. Providers purchase packs at this price; each quote submission consumes 1 token when mode is \'bid_credits\'.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 200,
    step: 5,
  },
  "payments.leadFeeSubscriptionMonthly": {
    label: "Monthly Subscription (₱/month)",
    description:
      "Monthly price (PHP) for an unlimited-leads subscription. Active subscribers skip per-quote charges when mode is \'subscription\'.",
    type: "number",
    unit: "₱",
    min: 0,
    max: 5000,
    step: 50,
  },
  // ── Limits ───────────────────────────────────────────────────────────────────
  "limits.maxQuotesPerJob": {
    label: "Max Quotes per Job",
    description:
      "Maximum number of provider quotes allowed on a single job posting.",
    type: "number",
    min: 1,
    max: 20,
    step: 1,
  },
  "limits.quoteValidityDays": {
    label: "Quote Validity (days)",
    description:
      "Number of days before an unanswered quote automatically expires.",
    type: "number",
    min: 1,
    max: 60,
    step: 1,
  },
  "limits.maxActiveJobsPerClient": {
    label: "Max Active Jobs per Client",
    description:
      "Maximum number of simultaneously open (unfilled) job postings a single client account can have.",
    type: "number",
    min: 1,
    max: 100,
    step: 1,
  },
  "limits.escrowAutoReleaseDays": {
    label: "Escrow Auto-Release (days)",
    description:
      "Days after a job is marked complete before escrow is automatically released to the provider if the client does not act.",
    type: "number",
    min: 1,
    max: 30,
    step: 1,
  },
  "limits.jobExpiryDays": {
    label: "Job Expiry (days)",
    description:
      "Days an open job listing waits for an accepted quote before it is automatically expired.",
    type: "number",
    min: 7,
    max: 90,
    step: 1,
  },
  "limits.disputeEscalationDays": {
    label: "Dispute Escalation (days)",
    description:
      "Days a dispute can remain open/investigating before admins receive an escalation notification.",
    type: "number",
    min: 1,
    max: 14,
    step: 1,
  },
  "limits.consultationExpiryDays": {
    label: "Consultation Expiry (days)",
    description:
      "Days before an unanswered consultation request automatically expires.",
    type: "number",
    min: 1,
    max: 30,
    step: 1,
  },
  "limits.dailyConsultationLimitClient": {
    label: "Daily Consultation Limit (Client)",
    description:
      "Maximum number of consultation requests a client can send per day.",
    type: "number",
    min: 1,
    max: 50,
    step: 1,
  },
  "limits.dailyConsultationLimitProvider": {
    label: "Daily Consultation Limit (Provider)",
    description:
      "Maximum number of consultation requests a provider can send per day.",
    type: "number",
    min: 1,
    max: 50,
    step: 1,
  },
  // ── Loyalty ──────────────────────────────────────────────────────────────────
  "loyalty.pointsPerPeso": {
    label: "Points Earned per ₱1 Spent",
    description:
      "How many loyalty points a client earns per ₱1 of job spend. Default 0.1 = 1 point per ₱10.",
    type: "number",
    min: 0.01,
    max: 1,
    step: 0.01,
  },
  "loyalty.pesoPerHundredPoints": {
    label: "₱ Value per 100 Points Redeemed",
    description:
      "Peso cashback value awarded when a client redeems 100 loyalty points.",
    type: "number",
    unit: "₱",
    min: 1,
    max: 100,
    step: 1,
  },
  "loyalty.minRedemptionPoints": {
    label: "Minimum Points per Redemption",
    description:
      "Minimum loyalty points a client must have to initiate a redemption request.",
    type: "number",
    min: 100,
    max: 5000,
    step: 100,
  },
  "loyalty.firstJobBonusPoints": {
    label: "First Job Bonus Points",
    description:
      "Bonus loyalty points awarded to a client when they complete their very first job.",
    type: "number",
    min: 0,
    max: 1000,
    step: 10,
  },
  "loyalty.tierThresholdSilver": {
    label: "Silver Tier Threshold",
    description:
      "Lifetime points required to reach Silver tier.",
    type: "number",
    min: 100,
    max: 10000,
    step: 100,
  },
  "loyalty.tierThresholdGold": {
    label: "Gold Tier Threshold",
    description:
      "Lifetime points required to reach Gold tier.",
    type: "number",
    min: 500,
    max: 50000,
    step: 100,
  },
  "loyalty.tierThresholdPlatinum": {
    label: "Platinum Tier Threshold",
    description:
      "Lifetime points required to reach Platinum tier.",
    type: "number",
    min: 1000,
    max: 100000,
    step: 500,
  },
  // ── Fraud & Security ─────────────────────────────────────────────────────────
  "fraud.jobFlagScore": {
    label: "Job Flag Score Threshold",
    description:
      "Risk score (0–100) at or above which a new job posting is flagged for admin review.",
    type: "number",
    min: 10,
    max: 100,
    step: 5,
  },
  "fraud.jobBlockScore": {
    label: "Job Block Score Threshold",
    description:
      "Risk score (0–100) at or above which a new job posting is automatically rejected and the client is notified.",
    type: "number",
    min: 10,
    max: 100,
    step: 5,
  },
  "fraud.highBudgetThreshold": {
    label: "High-Budget Fraud Threshold",
    description:
      "Job budgets (₱) above this value incur an elevated fraud risk score. Helps catch inflated-budget scam posts.",
    type: "number",
    unit: "₱",
    min: 1000,
    max: 100000,
    step: 500,
  },
};

const TABS: Tab[] = [
  {
    id: "general",
    label: "General",
    icon: <Server className="h-4 w-4" />,
    keys: ["platform.maintenanceMode", "platform.newRegistrations", "platform.kycRequired"],
  },
  {
    id: "board",
    label: "Job Board",
    icon: <LayoutDashboard className="h-4 w-4" />,
    keys: [
      "board.ads",
      "board.adsEnabled",
      "board.lguFilterEnabled",
      "board.activityFeed",
      "board.earningsWidget",
      "board.categoryDemand",
      "board.achievementsWidget",
      "board.urgentJobs",
      "board.trainingCta",
      "board.marketplaceStats",
      "board.priceGuide",
      "board.businessCta",
      "board.partners",
      "board.jobAlerts",
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: <Wallet className="h-4 w-4" />,
    keys: [
      "payments.baseCommissionRate",
      "payments.highCommissionRate",
      "payments.minJobBudget",
      "payments.minPayoutAmount",
      "payments.escrowServiceFeeRate",
      "payments.processingFeeRate",
      "payments.withdrawalFeeBank",
      "payments.withdrawalFeeGcash",
      "payments.urgencyFeeSameDay",
      "payments.urgencyFeeRush",
      "payments.platformServiceFeeRate",
      "payments.featuredListingFeaturedProvider",
      "payments.featuredListingTopSearch",
      "payments.featuredListingHomepage",
      "payments.leadFeeEnabled",
      "payments.leadFeeMode",
      "payments.leadFeePayPerLead",
      "payments.leadFeeBidCreditPrice",
      "payments.leadFeeSubscriptionMonthly",
    ],
  },
  {
    id: "limits",
    label: "Limits",
    icon: <Settings2 className="h-4 w-4" />,
    keys: [
      "limits.maxQuotesPerJob",
      "limits.quoteValidityDays",
      "limits.maxActiveJobsPerClient",
      "limits.escrowAutoReleaseDays",
      "limits.jobExpiryDays",
      "limits.disputeEscalationDays",
      "limits.consultationExpiryDays",
      "limits.dailyConsultationLimitClient",
      "limits.dailyConsultationLimitProvider",
    ],
  },
  {
    id: "loyalty",
    label: "Loyalty",
    icon: <Gift className="h-4 w-4" />,
    keys: [
      "loyalty.pointsPerPeso",
      "loyalty.pesoPerHundredPoints",
      "loyalty.minRedemptionPoints",
      "loyalty.firstJobBonusPoints",
      "loyalty.tierThresholdSilver",
      "loyalty.tierThresholdGold",
      "loyalty.tierThresholdPlatinum",
    ],
  },
  {
    id: "fraud",
    label: "Fraud & Security",
    icon: <Shield className="h-4 w-4" />,
    keys: [
      "fraud.jobFlagScore",
      "fraud.jobBlockScore",
      "fraud.highBudgetThreshold",
    ],
  },
];

// ─── CSS toggle switch ────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  id,
  danger,
}: {
  checked: boolean;
  onChange: () => void;
  id: string;
  danger?: boolean;
}) {
  const activeColor = danger
    ? "bg-amber-500 focus-visible:ring-amber-400"
    : "bg-blue-600 focus-visible:ring-blue-500";
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        checked ? activeColor : "bg-slate-200 dark:bg-slate-600 focus-visible:ring-slate-400"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-72 rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
    </div>
  );
}

// ─── Dangerous keys that warrant amber highlight ──────────────────────────────
const DANGER_KEYS = new Set(["platform.maintenanceMode"]);

// ─── Ads Manager ─────────────────────────────────────────────────────────────
const EMPTY_AD: Omit<ManagedAd, "id"> = { theme: "blue", eyebrow: "", headline: "", sub: "", cta: "", url: "" };

function AdsManager({ ads, onChange }: { ads: ManagedAd[]; onChange: (ads: ManagedAd[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft]         = useState<Omit<ManagedAd, "id">>(EMPTY_AD);
  const [adding, setAdding]       = useState(false);
  const [newDraft, setNewDraft]   = useState<Omit<ManagedAd, "id">>(EMPTY_AD);

  function startEdit(ad: ManagedAd) {
    setEditingId(ad.id);
    setDraft({ theme: ad.theme, eyebrow: ad.eyebrow, headline: ad.headline, sub: ad.sub, cta: ad.cta ?? "", url: ad.url ?? "" });
  }

  function saveEdit() {
    onChange(ads.map((a) => a.id === editingId ? { ...a, ...draft } : a));
    setEditingId(null);
  }

  function deleteAd(id: string) { onChange(ads.filter((a) => a.id !== id)); }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...ads];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }

  function moveDown(idx: number) {
    if (idx === ads.length - 1) return;
    const next = [...ads];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  function addAd() {
    if (!newDraft.headline.trim()) return;
    onChange([...ads, { ...newDraft, id: `ad-${Date.now()}` }]);
    setNewDraft(EMPTY_AD);
    setAdding(false);
  }

  function AdForm({ value, onChange: onDraftChange, onSave, onCancel, saveLabel }: {
    value: Omit<ManagedAd, "id">;
    onChange: (v: Omit<ManagedAd, "id">) => void;
    onSave: () => void;
    onCancel: () => void;
    saveLabel: string;
  }) {
    const f = (field: keyof Omit<ManagedAd, "id">) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        onDraftChange({ ...value, [field]: e.target.value });
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Eyebrow <span className="text-slate-400">(with emoji)</span></label>
            <input className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={value.eyebrow} onChange={f("eyebrow")} placeholder="🚀  Join the Platform" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Theme</label>
            <select className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={value.theme} onChange={f("theme")}>
              {(Object.keys(THEME_PRESETS) as AdTheme[]).map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Headline <span className="text-red-400">*</span></label>
          <input className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={value.headline} onChange={f("headline")} placeholder="Become a Verified Provider" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Body text</label>
          <textarea rows={2} className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" value={value.sub} onChange={f("sub")} placeholder="Short description that appears under the headline…" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">CTA label <span className="text-slate-400">(optional)</span></label>
            <input className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={value.cta ?? ""} onChange={f("cta")} placeholder="Sign up free →" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">URL <span className="text-slate-400">(optional)</span></label>
            <input className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={value.url ?? ""} onChange={f("url")} placeholder="/register?role=provider" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-3 w-3" /> Cancel
          </button>
          <button type="button" onClick={onSave} disabled={!value.headline.trim()} className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors">
            <Save className="h-3 w-3" /> {saveLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ad Flash Slides</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Full-screen ads shown on the public board. Cycle order follows the list below.</p>
        </div>
        <button
          type="button"
          onClick={() => { setAdding(true); setNewDraft(EMPTY_AD); }}
          disabled={adding}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Add Ad
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {ads.length === 0 && !adding && (
          <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            No ads configured. Click <span className="font-semibold">Add Ad</span> to create one.
          </div>
        )}

        {ads.map((ad, idx) => {
          const theme = THEME_PRESETS[ad.theme] ?? THEME_PRESETS.blue;
          const isEditing = editingId === ad.id;
          return (
            <div key={ad.id} className="px-5 py-3">
              {isEditing ? (
                <AdForm value={draft} onChange={setDraft} onSave={saveEdit} onCancel={() => setEditingId(null)} saveLabel="Save" />
              ) : (
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${theme.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{ad.eyebrow || <i className="not-italic text-slate-300">no eyebrow</i>}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{ad.headline || <i className="not-italic text-slate-400">no headline</i>}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{ad.sub}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-0.5">
                    <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0} title="Move up" className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => moveDown(idx)} disabled={idx === ads.length - 1} title="Move down" className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => startEdit(ad)} title="Edit" className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteAd(ad.id)} title="Delete" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {adding && (
          <div className="px-5 py-4">
            <AdForm value={newDraft} onChange={setNewDraft} onSave={addAd} onCancel={() => setAdding(false)} saveLabel="Add" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AppSettingsClient() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  // Track the last-persisted snapshot to detect unsaved changes
  const [savedSettings, setSavedSettings] = useState<AppSettings>(DEFAULTS);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data: AppSettings = await res.json();
      const merged = { ...DEFAULTS, ...data };
      setSettings(merged);
      setSavedSettings(merged);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    try {
      setSaving(true);
      setSaved(false);
      setError(null);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const updated: AppSettings = await res.json();
      const merged = { ...DEFAULTS, ...updated };
      setSettings(merged);
      setSavedSettings(merged);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saving && !loading) handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, saving, loading]);

  function toggleBoolean(key: string) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setNumber(key: string, raw: string) {
    const n = parseFloat(raw);
    setSettings((prev) => ({ ...prev, [key]: isNaN(n) ? prev[key] : n }));
  }

  function resetTab(tab: Tab) {
    const patch: AppSettings = {};
    for (const key of tab.keys) patch[key] = DEFAULTS[key];
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function setAds(ads: ManagedAd[]) {
    setSettings((prev) => ({ ...prev, "board.ads": ads }));
  }

  // Dirty detection helpers
  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings]
  );

  function isTabDirty(tab: Tab) {
    return tab.keys.some((k) => JSON.stringify(settings[k]) !== JSON.stringify(savedSettings[k]));
  }

  const currentTab = TABS.find((t) => t.id === activeTab)!;
  const maintenanceOn = !!settings["platform.maintenanceMode"];

  return (
    <div className="flex h-full min-h-screen bg-slate-50 dark:bg-slate-900">

      {/* ── Left sidebar: tab navigation ───────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100 dark:border-slate-700">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
            App Settings
          </span>
        </div>

        {/* Tab list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {TABS.map((tab) => {
            const tabDirty = isTabDirty(tab);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span className={isActive ? "text-blue-500 dark:text-blue-400" : ""}>{tab.icon}</span>
                {tab.label}
                {tabDirty && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer: save controls */}
        <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-4 space-y-2">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </div>
          )}
          {isDirty && !saved && (
            <p className="text-xs text-amber-600 dark:text-amber-400 px-1">Unsaved changes</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading || !isDirty}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
            <kbd className="font-mono">Ctrl S</kbd> to save
          </p>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">
              {currentTab.label}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage platform-wide configuration and feature flags.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile save */}
            <button
              onClick={handleSave}
              disabled={saving || loading || !isDirty}
              className="md:hidden inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={fetchSettings}
              disabled={loading}
              title="Refresh"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              aria-label="Refresh settings"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Mobile tab strip */}
        <div className="md:hidden flex gap-1 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {TABS.map((tab) => {
            const tabDirty = isTabDirty(tab);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-shrink-0 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tabDirty && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable settings area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Maintenance mode banner */}
          {maintenanceOn && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Maintenance Mode is ON
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  The platform is offline for all non-admin users. Remember to turn this off when done.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Settings card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
            {/* Card header */}
            <div className="px-5 py-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500">{currentTab.icon}</span>
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {currentTab.label}
                </h2>
              </div>
              {!loading && isTabDirty(currentTab) && (
                <button
                  onClick={() => resetTab(currentTab)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset tab
                </button>
              )}
            </div>

            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              currentTab.keys.map((key) => {
                const meta = SETTING_META[key];
                if (!meta) return null;
                const isDanger = DANGER_KEYS.has(key);
                const isChanged = settings[key] !== savedSettings[key];
                const rowBg = isDanger && !!settings[key]
                  ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  : isChanged
                  ? "bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/30";

                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors ${rowBg}`}
                  >
                    <label htmlFor={`setting-${key}`} className="min-w-0 flex-1 cursor-pointer">
                      <p className={`text-sm font-medium ${isDanger && !!settings[key] ? "text-amber-700 dark:text-amber-300" : "text-slate-800 dark:text-white"}`}>
                        {meta.label}
                        {isChanged && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400">
                            changed
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {meta.description}
                      </p>
                    </label>

                    {meta.type === "boolean" && (
                      <Toggle
                        id={`setting-${key}`}
                        checked={!!settings[key]}
                        onChange={() => toggleBoolean(key)}
                        danger={isDanger}
                      />
                    )}

                    {meta.type === "number" && (
                      <div className="flex-shrink-0">
                        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                          {meta.unit && meta.unit !== "%" && (
                            <span className="px-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-600/50 select-none">
                              {meta.unit}
                            </span>
                          )}
                          <input
                            id={`setting-${key}`}
                            type="number"
                            value={String(settings[key] ?? DEFAULTS[key] ?? "")}
                            min={meta.min}
                            max={meta.max}
                            step={meta.step ?? 1}
                            onChange={(e) => setNumber(key, e.target.value)}
                            className="w-20 bg-transparent text-slate-800 dark:text-white text-sm px-3 py-1.5 text-right focus:outline-none"
                          />
                          {meta.unit === "%" && (
                            <span className="px-2.5 py-1.5 text-sm text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-600/50 select-none">
                              %
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {meta.type === "select" && meta.options && (
                      <div className="flex-shrink-0">
                        <select
                          id={`setting-${key}`}
                          value={String(settings[key] ?? DEFAULTS[key] ?? "")}
                          onChange={(e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {meta.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Ad Flash manager — board tab only */}
          {activeTab === "board" && (
            <AdsManager
              ads={(settings["board.ads"] as ManagedAd[] | undefined) ?? DEFAULT_ADS}
              onChange={setAds}
            />
          )}

        </div>
      </div>
    </div>
  );
}
