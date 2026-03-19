import Category, { DEFAULT_CATEGORIES } from "@/models/Category";
import type { CategoryDocument } from "@/models/Category";
import { BaseRepository } from "./base.repository";

export class CategoryRepository extends BaseRepository<CategoryDocument> {
  constructor() {
    super(Category);
  }

  /** All active categories sorted by order then name (lean, selected fields). Capped at 500 rows. */
  async findActive(): Promise<CategoryDocument[]> {
    await this.connect();
    return Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .limit(500)
      .select("_id name slug icon description order")
      .lean() as unknown as CategoryDocument[];
  }

  /** All categories (active + inactive) sorted by order then name. Capped at 500 rows. */
  async findAll(): Promise<CategoryDocument[]> {
    await this.connect();
    return Category.find()
      .sort({ order: 1, name: 1 })
      .limit(500)
      .lean() as unknown as CategoryDocument[];
  }

  /** Seed default categories if the collection is empty. */
  async seedIfEmpty(): Promise<void> {
    await this.connect();
    const count = await Category.countDocuments();
    if (count === 0) {
      const docs = DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        slug: c.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        isActive: true,
      }));
      await Category.insertMany(docs);
    }
  }

  /** Returns a category matching either the name or slug. Used for conflict detection. */
  async findByNameOrSlug(name: string, slug: string): Promise<CategoryDocument | null> {
    await this.connect();
    return Category.findOne({ $or: [{ name }, { slug }] }).lean() as unknown as CategoryDocument | null;
  }

  /** Returns the highest order value currently in the collection. */
  async findMaxOrder(): Promise<number> {
    await this.connect();
    const doc = await Category.findOne()
      .sort({ order: -1 })
      .select("order")
      .lean() as { order?: number } | null;
    return doc?.order ?? -1;
  }

  /** Hard-delete a category by id. Returns the deleted document or null if not found. */
  async deleteById(id: string): Promise<CategoryDocument | null> {
    await this.connect();
    return Category.findByIdAndDelete(id).lean() as unknown as CategoryDocument | null;
  }
}

export const categoryRepository = new CategoryRepository();
