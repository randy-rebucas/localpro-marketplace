import Skill, { SKILL_SEEDS } from "@/models/Skill";
import { connectDB } from "@/lib/db";

class SkillRepository {
  private seeded = false;

  private async connect() {
    await connectDB();
  }

  /** Returns display labels matching a prefix, sorted by usage desc. */
  async search(q: string, limit = 10): Promise<string[]> {
    await this.connect();
    await this.ensureSeeded();

    const docs = await Skill.find(
      q.trim()
        ? { name: { $regex: `^${q.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" } }
        : {}
    )
      .sort({ usageCount: -1, name: 1 })
      .limit(limit)
      .lean();

    return docs.map((d) => d.label);
  }

  /**
   * Upsert a batch of skill labels (from a saved provider profile).
   * Increments usageCount for existing entries.
   */
  async upsertMany(labels: string[]): Promise<void> {
    await this.connect();
    if (!labels.length) return;

    const ops = labels.map((label) => ({
      updateOne: {
        filter: { name: label.toLowerCase().trim() },
        update: {
          $set: { label: label.trim() },
          $inc: { usageCount: 1 },
        },
        upsert: true,
      },
    }));

    await Skill.bulkWrite(ops);
  }

  /** Seeds the collection with common trades if it's empty. */
  private async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    const count = await Skill.countDocuments();
    if (count === 0) {
      const ops = SKILL_SEEDS.map((label) => ({
        updateOne: {
          filter: { name: label.toLowerCase() },
          update: { $setOnInsert: { label, usageCount: 0 } },
          upsert: true,
        },
      }));
      await Skill.bulkWrite(ops);
    }
    this.seeded = true;
  }
}

export const skillRepository = new SkillRepository();
