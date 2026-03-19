import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireRole } from "@/lib/auth";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

/**
 * POST /api/admin/migrate-skills?dryRun=true
 *
 * One-time migration: converts legacy `skills: string[]` to
 * `skills: Array<{ skill, yearsExperience, hourlyRate }>` in providerprofiles.
 *
 * Requires admin role. Remove this route after migration is complete.
 */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, "admin");

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "true";

  await connectDB();
  const db = mongoose.connection.db!;
  const collection = db.collection("providerprofiles");

  // Find documents where the first skills element is a plain string (legacy format)
  const filter = { "skills.0": { $type: "string" } };
  const legacyDocs = await collection.find(filter).toArray();

  if (legacyDocs.length === 0) {
    return NextResponse.json({ message: "No legacy documents found. Nothing to migrate.", count: 0 });
  }

  if (dryRun) {
    const preview = legacyDocs.map((doc) => ({
      _id: String(doc._id),
      skills: doc.skills,
    }));
    return NextResponse.json({
      message: `Dry run: ${legacyDocs.length} document(s) would be migrated`,
      dryRun: true,
      count: legacyDocs.length,
      preview,
    });
  }

  // Build bulkWrite operations
  const ops = legacyDocs.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: {
        $set: {
          skills: (doc.skills as string[]).map((s) => ({
            skill: String(s),
            yearsExperience: 0,
            hourlyRate: "",
          })),
        },
      },
    },
  }));

  const result = await collection.bulkWrite(ops, { ordered: false });

  return NextResponse.json({
    message: `Migrated ${result.modifiedCount} document(s)`,
    count: result.modifiedCount,
    expected: legacyDocs.length,
  });
});
