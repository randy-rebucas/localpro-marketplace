/**
 * User Sync Migration Script
 * --------------------------
 * Backfills all existing users with:
 *   1. Missing schema fields (new columns added over time)
 *   2. Avatar resolution — fetches real photos via:
 *        • Facebook Graph API  (facebookId users)
 *        • Google People API   (googleId users, requires app token)
 *        • Gravatar            (MD5 of email — checked live)
 *        • ui-avatars.com      (deterministic initials fallback)
 *
 * Usage:
 *   node --env-file=.env.local scripts/sync-users.mjs
 *
 * Flags:
 *   --dry-run          Print what would change, make no DB writes
 *   --avatars-only     Only run avatar resolution, skip field backfill
 *   --fields-only      Only backfill missing fields, skip avatar resolution
 *   --batch=200        Number of users to process per DB page (default 100)
 */

import mongoose from "mongoose";
import { createHash } from "crypto";

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const DRY_RUN     = args.includes("--dry-run");
const AVATARS_ONLY  = args.includes("--avatars-only");
const FIELDS_ONLY   = args.includes("--fields-only");
const BATCH_SIZE  = parseInt(args.find(a => a.startsWith("--batch="))?.split("=")[1] ?? "100", 10);

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGODB_URI     = process.env.MONGODB_URI;
const FB_APP_ID       = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET   = process.env.FACEBOOK_APP_SECRET;
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/sync-users.mjs");
  process.exit(1);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = {
  total:          0,
  fieldsPatched:  0,
  avatarsResolved: 0,
  avatarSources:  { facebook: 0, google: 0, gravatar: 0, generated: 0 },
  skipped:        0,
  errors:         0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function md5(str) {
  return createHash("md5").update(str.toLowerCase().trim()).digest("hex");
}

function log(msg) {
  console.log(`[sync-users] ${msg}`);
}

/** GET a URL and return { ok, status, url } after following redirects. */
async function headCheck(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return { ok: res.ok, status: res.status, url: res.url };
  } catch {
    return { ok: false, status: 0, url };
  }
}

/** GET a URL and return parsed JSON, or null on failure. */
async function getJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Facebook App Access Token ────────────────────────────────────────────────
// App tokens allow fetching profile pictures for any user with a stored facebookId.

let fbAppToken = null;

async function getFacebookAppToken() {
  if (fbAppToken) return fbAppToken;
  if (!FB_APP_ID || !FB_APP_SECRET) return null;

  const data = await getJson(
    `https://graph.facebook.com/oauth/access_token` +
    `?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&grant_type=client_credentials`
  );
  fbAppToken = data?.access_token ?? null;
  if (fbAppToken) log("✅  Facebook app token obtained");
  else             log("⚠️   Could not get Facebook app token — will skip Facebook avatars");
  return fbAppToken;
}

// ─── Avatar resolution ────────────────────────────────────────────────────────

/**
 * Resolve the best available avatar URL for a user.
 * Returns null if the user already has a non-null avatar (nothing to do).
 */
async function resolveAvatar(user) {
  if (user.avatar) return null; // already set

  const name = (user.name ?? "User").trim();

  // ── 1. Facebook profile picture ──────────────────────────────────────────
  if (user.facebookId) {
    const token = await getFacebookAppToken();
    if (token) {
      const picData = await getJson(
        `https://graph.facebook.com/${user.facebookId}/picture` +
        `?type=normal&redirect=false&access_token=${token}`
      );
      const url = picData?.data?.url;
      // Facebook returns is_silhouette=true for users with no photo
      if (url && picData?.data?.is_silhouette === false) {
        stats.avatarSources.facebook++;
        return { url, source: "facebook" };
      }
    }
  }

  // ── 2. Google profile picture ─────────────────────────────────────────────
  // Google OAuth stores picture in the profile at sign-in time; if googleId
  // is set but avatar is empty the picture was unavailable at login. We can
  // attempt a lookup via the People API using only the sub ID, but that
  // requires per-user tokens we don't store. Skip silently — Gravatar covers.
  //
  // If GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set we could do a service-
  // account lookup, but that requires Domain-wide delegation — out of scope.

  // ── 3. Gravatar ───────────────────────────────────────────────────────────
  if (user.email) {
    const hash = md5(user.email);
    // ?d=404 makes Gravatar return 404 instead of a generic silhouette
    const { ok, url: finalUrl } = await headCheck(
      `https://www.gravatar.com/avatar/${hash}?s=200&d=404`
    );
    if (ok) {
      // Strip the ?d=404 so the stored URL returns the actual image
      const cleanUrl = `https://www.gravatar.com/avatar/${hash}?s=200`;
      stats.avatarSources.gravatar++;
      return { url: cleanUrl, source: "gravatar" };
    }
  }

  // ── 4. Generated initials (ui-avatars) ───────────────────────────────────
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const bgColors = ["1e3a5f", "065f46", "7c2d12", "1e40af", "6b21a8", "0e7490"];
  const bg       = bgColors[user._id.toString().charCodeAt(0) % bgColors.length];
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=fff&bold=true&size=200`;
  stats.avatarSources.generated++;
  return { url, source: "generated" };
}

// ─── Field defaults ───────────────────────────────────────────────────────────
// For each field, provide the default value to set when the field is missing.
// Mongoose $exists: false catches fields that were never written.

const FIELD_DEFAULTS = {
  isDeleted:              false,
  deletedAt:              null,
  flaggedJobCount:        0,
  fraudFlags:             [],
  savedPaymentMethodId:   null,
  savedPaymentMethodLast4: null,
  savedPaymentMethodBrand: null,
  failedLoginAttempts:    0,
  lockedUntil:            null,
  lastSeenAt:             null,
  sentDripDay3At:         null,
  sentDripDay7At:         null,
  googleId:               null,
  oauthProvider:          null,
  accountType:            "personal",
  approvalStatus:         "approved",
  kycStatus:              "none",
  kycRejectionReason:     null,
  capabilities:           [],
  addresses:              [],
  phone:                  null,
  dateOfBirth:            null,
  gender:                 null,
  agencyId:               null,
  // preferences sub-doc defaults
  "preferences.emailNotifications":   true,
  "preferences.pushNotifications":    true,
  "preferences.smsNotifications":     false,
  "preferences.marketingEmails":      false,
  "preferences.messageNotifications": true,
  "preferences.profileVisible":       true,
  "preferences.newJobAlerts":         true,
  "preferences.quoteExpiryReminders": true,
  "preferences.jobInviteAlerts":      true,
  "preferences.reviewAlerts":         true,
  "preferences.instantBooking":       false,
  "preferences.autoReadReceipt":      false,
  "preferences.emailCategories.jobUpdates":    true,
  "preferences.emailCategories.quoteAlerts":   true,
  "preferences.emailCategories.paymentAlerts": true,
  "preferences.emailCategories.disputeAlerts": true,
  "preferences.emailCategories.reminders":     true,
  "preferences.emailCategories.messages":      true,
  "preferences.emailCategories.consultations": true,
  "preferences.emailCategories.reviews":       true,
};

// ─── Phase 1: Bulk field backfill ─────────────────────────────────────────────
// Run one updateMany per field so MongoDB only touches documents that need it.

async function backfillFields(User) {
  log("Phase 1: Backfilling missing fields…");
  let totalUpdated = 0;

  for (const [field, defaultValue] of Object.entries(FIELD_DEFAULTS)) {
    const filter = { [field]: { $exists: false } };
    const count = await User.countDocuments(filter);
    if (count === 0) continue;

    log(`  → ${field}: ${count} users missing this field`);

    if (!DRY_RUN) {
      const result = await User.updateMany(filter, { $set: { [field]: defaultValue } });
      totalUpdated += result.modifiedCount;
    } else {
      log(`  [dry-run] Would set ${field}=${JSON.stringify(defaultValue)} on ${count} users`);
      totalUpdated += count;
    }
  }

  // Also fix users where googleId / facebookId exist but oauthProvider is unset
  const fbFix = await User.countDocuments({ facebookId: { $ne: null }, oauthProvider: { $in: [null, undefined] } });
  if (fbFix > 0) {
    log(`  → oauthProvider: ${fbFix} facebook-linked users missing provider label`);
    if (!DRY_RUN) await User.updateMany(
      { facebookId: { $ne: null }, oauthProvider: { $in: [null, undefined] } },
      { $set: { oauthProvider: "facebook" } }
    );
  }

  const gFix = await User.countDocuments({ googleId: { $ne: null }, oauthProvider: { $in: [null, undefined] } });
  if (gFix > 0) {
    log(`  → oauthProvider: ${gFix} google-linked users missing provider label`);
    if (!DRY_RUN) await User.updateMany(
      { googleId: { $ne: null }, oauthProvider: { $in: [null, undefined] } },
      { $set: { oauthProvider: "google" } }
    );
  }

  stats.fieldsPatched = totalUpdated;
  log(`  ✅  Fields phase done. ${totalUpdated} documents updated.`);
}

// ─── Phase 2: Avatar resolution ───────────────────────────────────────────────

async function resolveAvatars(User) {
  log("Phase 2: Resolving avatars for users without one…");

  const noAvatarCount = await User.countDocuments({ $or: [{ avatar: null }, { avatar: { $exists: false } }] });
  log(`  ${noAvatarCount} users have no avatar`);

  if (noAvatarCount === 0) {
    log("  ✅  Nothing to do.");
    return;
  }

  let cursor = User.find({ $or: [{ avatar: null }, { avatar: { $exists: false } }] })
    .select("_id name email facebookId googleId avatar oauthProvider")
    .batchSize(BATCH_SIZE)
    .cursor();

  let processed = 0;

  for await (const user of cursor) {
    processed++;
    stats.total++;

    try {
      const result = await resolveAvatar(user);
      if (!result) { stats.skipped++; continue; }

      if (DRY_RUN) {
        log(`  [dry-run] ${user.email ?? user._id}: avatar from ${result.source} → ${result.url.slice(0, 80)}`);
      } else {
        await User.updateOne({ _id: user._id }, { $set: { avatar: result.url } });
      }

      stats.avatarsResolved++;

      if (processed % 50 === 0) {
        log(`  … ${processed}/${noAvatarCount} processed`);
      }
    } catch (err) {
      stats.errors++;
      console.error(`  ❌  Error on user ${user._id}:`, err.message);
    }
  }

  log(`  ✅  Avatars phase done. ${stats.avatarsResolved} resolved.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("─".repeat(60));
  console.log("  LocalPro User Sync Script");
  if (DRY_RUN)   console.log("  ⚠️   DRY RUN — no writes will be made");
  if (AVATARS_ONLY) console.log("  ℹ️   Mode: avatars-only");
  if (FIELDS_ONLY)  console.log("  ℹ️   Mode: fields-only");
  console.log("─".repeat(60));

  await mongoose.connect(MONGODB_URI, { dbName: undefined });
  log("Connected to MongoDB");

  // Minimal inline schema so the script runs standalone (no TS compilation)
  const userSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const User = mongoose.models.User ?? mongoose.model("User", userSchema);

  const totalUsers = await User.countDocuments();
  log(`Total users in DB: ${totalUsers}`);

  if (!AVATARS_ONLY) await backfillFields(User);
  if (!FIELDS_ONLY)  await resolveAvatars(User);

  console.log("\n" + "─".repeat(60));
  console.log("  SYNC COMPLETE");
  console.log("─".repeat(60));
  console.log(`  Total users:         ${totalUsers}`);
  console.log(`  Fields patched:      ${stats.fieldsPatched}`);
  console.log(`  Avatars resolved:    ${stats.avatarsResolved}`);
  console.log(`    Facebook:          ${stats.avatarSources.facebook}`);
  console.log(`    Google (OAuth):    ${stats.avatarSources.google}`);
  console.log(`    Gravatar:          ${stats.avatarSources.gravatar}`);
  console.log(`    Generated:         ${stats.avatarSources.generated}`);
  console.log(`  Errors:              ${stats.errors}`);
  if (DRY_RUN) console.log("\n  ⚠️   DRY RUN — run without --dry-run to apply changes");
  console.log("─".repeat(60));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
