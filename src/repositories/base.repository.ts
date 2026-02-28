import { Document, Model, FilterQuery, UpdateQuery } from "mongoose";
import { connectDB } from "@/lib/db";
import "@/models/User"; // ensure User schema is registered for all populate() calls across repositories

/**
 * Generic base repository.
 * Encapsulates all Mongoose I/O so service layer stays framework-agnostic.
 *
 * Naming convention:
 *  - find*   → returns lean plain objects (safe for serialisation)
 *  - getDoc* → returns full Mongoose document (for mutation + save)
 */
export abstract class BaseRepository<TDoc extends Document> {
  constructor(protected readonly model: Model<TDoc>) {}

  protected async connect(): Promise<void> {
    await connectDB();
  }

  async findById(id: string): Promise<TDoc | null> {
    await this.connect();
    return this.model.findById(id).lean() as unknown as TDoc | null;
  }

  /** Returns a full Mongoose document for mutation workflows. */
  async getDocById(id: string): Promise<TDoc | null> {
    await this.connect();
    return this.model.findById(id);
  }

  async findOne(filter: FilterQuery<TDoc>): Promise<TDoc | null> {
    await this.connect();
    return this.model.findOne(filter).lean() as unknown as TDoc | null;
  }

  async find(filter: FilterQuery<TDoc>): Promise<TDoc[]> {
    await this.connect();
    return this.model.find(filter).lean() as unknown as TDoc[];
  }

  async create(data: Partial<TDoc> | Record<string, unknown>): Promise<TDoc> {
    await this.connect();
    const doc = await this.model.create(data);
    return doc.toObject() as TDoc;
  }

  async updateById(
    id: string,
    update: UpdateQuery<TDoc>
  ): Promise<TDoc | null> {
    await this.connect();
    return this.model
      .findByIdAndUpdate(id, update, { new: true })
      .lean() as unknown as TDoc | null;
  }

  async updateMany(
    filter: FilterQuery<TDoc>,
    update: UpdateQuery<TDoc>
  ): Promise<void> {
    await this.connect();
    await this.model.updateMany(filter, update);
  }

  async count(filter: FilterQuery<TDoc>): Promise<number> {
    await this.connect();
    return this.model.countDocuments(filter);
  }

  async exists(filter: FilterQuery<TDoc>): Promise<boolean> {
    await this.connect();
    return (await this.model.countDocuments(filter)) > 0;
  }
}
