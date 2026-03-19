/**
 * Migrate Skills: string[] -> object[]
 * -------------------------------------
 * Converts legacy `skills: ["Plumbing", "Electrical"]` arrays to the new
 * object format `skills: [{ skill: "Plumbing", yearsExperience: 0, hourlyRate: "" }, ...]`
 * in the `providerprofiles` collection.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-skills.mjs
 *   node --env-file=.env.local scripts/migrate-skills.mjs --dry-run
 *
 * Idempotent: only touches documents whose first skill element is a string.
 * Documents already in object format are skipped by the query filter.
 */

import mongoose from "mongoose";

// ─── Parse CLI flags ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error(
    "MONGODB_URI is not set. Run with:\n  node --env-file=.env.local scripts/migrate-skills.mjs"
  );
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected: ${mongoose.connection.name}`);
  if (DRY_RUN) console.log("** DRY-RUN MODE — no documents will be modified **\n");

  const db = mongoose.connection.db;
  const collection = db.collection("providerprofiles");

  // Find documents where the first skills element is a plain string (legacy format).
  const filter = { "skills.0": { $type: "string" } };
  const legacyDocs = await collection.find(filter).toArray();

  console.log(`Documents with legacy string[] skills: ${legacyDocs.length}`);

  if (legacyDocs.length === 0) {
    console.log("Nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  if (DRY_RUN) {
    for (const doc of legacyDocs) {
      console.log(`  [dry-run] ${doc._id} — ${doc.skills.length} skill(s): ${doc.skills.join(", ")}`);
    }
    console.log(`\nDry run complete. ${legacyDocs.length} document(s) would be migrated.`);
    await mongoose.disconnect();
    return;
  }

  // Build bulkWrite operations
  const ops = legacyDocs.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: {
        $set: {
          skills: doc.skills.map((s) => ({
            skill: String(s),
            yearsExperience: 0,
            hourlyRate: "",
          })),
        },
      },
    },
  }));

  const result = await collection.bulkWrite(ops, { ordered: false });

  console.log(`Migrated: ${result.modifiedCount} document(s)`);
  if (result.modifiedCount !== legacyDocs.length) {
    console.warn(
      `Warning: expected ${legacyDocs.length} modifications but got ${result.modifiedCount}. ` +
        "Some documents may have been updated concurrently."
    );
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
