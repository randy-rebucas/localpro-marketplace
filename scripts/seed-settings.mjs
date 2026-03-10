/**
 * App Settings Seed Script
 * -------------------------
 * Upserts all known AppSetting keys with their default values.
 * Safe to run multiple times — existing values are NOT overwritten,
 * only missing keys are inserted.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-settings.mjs
 *
 * Flags:
 *   --force   Overwrite existing values with defaults (full reset)
 */

import mongoose from "mongoose";

// ─── CLI flags ────────────────────────────────────────────────────────────────
const FORCE = process.argv.includes("--force");

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed-settings.mjs");
  process.exit(1);
}

// ─── Inline AppSetting model ──────────────────────────────────────────────────
const AppSettingSchema = new mongoose.Schema(
  {
    key:         { type: String, required: true, unique: true, trim: true },
    value:       { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const AppSetting =
  mongoose.models.AppSetting ??
  mongoose.model("AppSetting", AppSettingSchema);

// ─── Default settings ─────────────────────────────────────────────────────────
/**
 * All keys used by the application.
 * Grouped by namespace for readability.
 *
 * Format: { key, value, description }
 */
const DEFAULT_SETTINGS = [
  // ── Platform ──────────────────────────────────────────────────────────────
  {
    key: "platform.maintenanceMode",
    value: false,
    description: "When true, all job posting and registration endpoints return 503.",
  },
  {
    key: "platform.newRegistrations",
    value: true,
    description: "When false, new user registrations are blocked (login still works).",
  },
  {
    key: "platform.kycRequired",
    value: false,
    description: "When true, clients must have kycStatus='approved' before posting jobs.",
  },

  // ── Payments & Commission ─────────────────────────────────────────────────
  {
    key: "payments.baseCommissionRate",
    value: 15,
    description: "Platform commission for standard job categories (whole number, e.g. 15 = 15%).",
  },
  {
    key: "payments.highCommissionRate",
    value: 20,
    description: "Platform commission for high-value categories (HVAC, Roofing, etc.). Whole number percentage.",
  },
  {
    key: "payments.minJobBudget",
    value: 500,
    description: "Minimum allowed job budget in PHP. Jobs below this amount are rejected at posting.",
  },
  {
    key: "payments.minPayoutAmount",
    value: 100,
    description: "Minimum payout or wallet withdrawal amount in PHP.",
  },

  // ── Limits ────────────────────────────────────────────────────────────────
  {
    key: "limits.maxQuotesPerJob",
    value: 5,
    description: "Maximum number of provider quotes allowed per job before the job stops accepting new quotes.",
  },
  {
    key: "limits.quoteValidityDays",
    value: 7,
    description: "Number of days before a submitted quote auto-expires.",
  },
  {
    key: "limits.maxActiveJobsPerClient",
    value: 10,
    description: "Maximum number of concurrent open/assigned/in-progress jobs a client can have.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg)  { console.log(`  ✅  ${msg}`); }
function skip(msg) { console.log(`  ⏩  ${msg}`); }
function warn(msg) { console.log(`  ⚠️   ${msg}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔌  Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log(`✅  Connected: ${mongoose.connection.name}\n`);

  if (FORCE) {
    console.log("⚠️   --force: existing values will be overwritten\n");
  }

  console.log("⚙️   Seeding app settings…\n");

  let inserted = 0;
  let skipped  = 0;
  let updated  = 0;

  for (const setting of DEFAULT_SETTINGS) {
    const existing = await AppSetting.findOne({ key: setting.key });

    if (!existing) {
      await AppSetting.create(setting);
      log(`Inserted  ${setting.key} = ${JSON.stringify(setting.value)}`);
      inserted++;
    } else if (FORCE) {
      await AppSetting.findOneAndUpdate(
        { key: setting.key },
        { value: setting.value, description: setting.description },
        { new: true }
      );
      warn(`Overwrite ${setting.key} = ${JSON.stringify(setting.value)}  (was: ${JSON.stringify(existing.value)})`);
      updated++;
    } else {
      skip(`Exists    ${setting.key} = ${JSON.stringify(existing.value)}`);
      skipped++;
    }
  }

  console.log(`
─────────────────────────────────────────
  Inserted : ${inserted}
  Skipped  : ${skipped}
  Updated  : ${updated}
  Total    : ${DEFAULT_SETTINGS.length}
─────────────────────────────────────────
`);

  await mongoose.disconnect();
  console.log("🔌  Disconnected.\n");
}

main().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
