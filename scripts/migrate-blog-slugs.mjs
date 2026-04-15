/**
 * Migrate Blog Slugs
 * ------------------
 * Backfills slug field for existing blog posts that don't have slugs.
 * Generates slug from title for all blogs where slug is missing or null.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-blog-slugs.mjs
 *   node --env-file=.env.local scripts/migrate-blog-slugs.mjs --dry-run
 *
 * Idempotent: only touches documents without a slug field.
 */

import mongoose from "mongoose";

// ─── Parse CLI flags ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error(
    "MONGODB_URI is not set. Run with:\n  node --env-file=.env.local scripts/migrate-blog-slugs.mjs"
  );
  process.exit(1);
}

// ─── Slug generation helper ───────────────────────────────────────────────────
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected: ${mongoose.connection.name}`);
  if (DRY_RUN) console.log("** DRY-RUN MODE — no documents will be modified **\n");

  const db = mongoose.connection.db;
  const collection = db.collection("blogs");

  // Find blogs without a slug field (or with null/empty slug)
  const filter = { 
    $or: [
      { slug: null },
      { slug: "" },
      { slug: { $exists: false } }
    ]
  };
  
  const blogsWithoutSlug = await collection.find(filter).toArray();

  console.log(`Blogs without slug: ${blogsWithoutSlug.length}`);

  if (blogsWithoutSlug.length === 0) {
    console.log("Nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  // Process each blog
  const updates = [];
  for (const blog of blogsWithoutSlug) {
    const slug = generateSlug(blog.title);
    
    console.log(`  - ${blog._id}: "${blog.title}" → slug: "${slug}"`);
    
    if (!DRY_RUN) {
      updates.push(
        collection.updateOne(
          { _id: blog._id },
          { $set: { slug } }
        )
      );
    }
  }

  if (!DRY_RUN) {
    const results = await Promise.all(updates);
    const modifiedCount = results.reduce((sum, r) => sum + r.modifiedCount, 0);
    console.log(`\n✓ Updated ${modifiedCount} blogs with generated slugs`);
  } else {
    console.log(`\n✓ [DRY-RUN] Would update ${blogsWithoutSlug.length} blogs with generated slugs`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
