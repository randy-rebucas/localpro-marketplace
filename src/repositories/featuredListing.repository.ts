import mongoose from "mongoose";
import FeaturedListing from "@/models/FeaturedListing";
import type { FeaturedListingDocument } from "@/models/FeaturedListing";
import type { FeaturedListingType, FeaturedListingStatus } from "@/types";
import { connectDB } from "@/lib/db";

export class FeaturedListingRepository {
  // ── Create ───────────────────────────────────────────────────────────────

  async create(data: {
    providerId: string;
    type: FeaturedListingType;
    startsAt: Date;
    expiresAt: Date;
    amountPaid: number;
    walletTxId?: string | null;
    paymongoSessionId?: string | null;
    ledgerJournalId?: string | null;
  }): Promise<FeaturedListingDocument> {
    await connectDB();
    return FeaturedListing.create({
      ...data,
      providerId: new mongoose.Types.ObjectId(data.providerId),
      walletTxId: data.walletTxId ? new mongoose.Types.ObjectId(data.walletTxId) : null,
      status: "active",
    }) as unknown as FeaturedListingDocument;
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  /** All active listings for a given provider */
  async findActiveByProvider(providerId: string): Promise<FeaturedListingDocument[]> {
    await connectDB();
    return FeaturedListing.find({
      providerId: new mongoose.Types.ObjectId(providerId),
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean() as unknown as FeaturedListingDocument[];
  }

  /** All active listings for a given type (e.g. for homepage strip query) */
  async findActiveByType(type: FeaturedListingType): Promise<FeaturedListingDocument[]> {
    await connectDB();
    return FeaturedListing.find({
      type,
      status: "active",
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean() as unknown as FeaturedListingDocument[];
  }

  /**
   * Returns provider IDs that have an active boost of the given type.
   * Used in the search/providers API to sort featured providers first.
   */
  async findActiveProviderIdsByType(type: FeaturedListingType): Promise<string[]> {
    await connectDB();
    const docs = await FeaturedListing.find(
      { type, status: "active", expiresAt: { $gt: new Date() } },
      { providerId: 1 }
    ).lean();
    return docs.map((d) => (d as { providerId: mongoose.Types.ObjectId }).providerId.toString());
  }

  /** All listings that are still marked "active" but past their expiresAt */
  async findExpiredActive(): Promise<FeaturedListingDocument[]> {
    await connectDB();
    return FeaturedListing.find({
      status: "active",
      expiresAt: { $lte: new Date() },
    }).lean() as unknown as FeaturedListingDocument[];
  }

  /** All listings for a provider (any status), sorted newest first */
  async findAllByProvider(providerId: string): Promise<FeaturedListingDocument[]> {
    await connectDB();
    return FeaturedListing.find({
      providerId: new mongoose.Types.ObjectId(providerId),
    })
      .sort({ createdAt: -1 })
      .lean() as unknown as FeaturedListingDocument[];
  }

  async findById(id: string): Promise<FeaturedListingDocument | null> {
    await connectDB();
    return FeaturedListing.findById(id).lean() as unknown as FeaturedListingDocument | null;
  }

  async findByPaymongoSession(sessionId: string): Promise<FeaturedListingDocument | null> {
    await connectDB();
    return FeaturedListing.findOne({ paymongoSessionId: sessionId }).lean() as unknown as FeaturedListingDocument | null;
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  async updateStatus(id: string, status: FeaturedListingStatus): Promise<void> {
    await connectDB();
    await FeaturedListing.findByIdAndUpdate(id, { $set: { status } });
  }

  async updateById(
    id: string,
    update: Partial<{
      status: FeaturedListingStatus;
      ledgerJournalId: string;
      paymongoSessionId: string;
      walletTxId: string;
    }>
  ): Promise<void> {
    await connectDB();
    await FeaturedListing.findByIdAndUpdate(id, { $set: update });
  }

  /** Bulk expire all stale active listings; returns the count updated */
  async expireStale(): Promise<number> {
    await connectDB();
    const result = await FeaturedListing.updateMany(
      { status: "active", expiresAt: { $lte: new Date() } },
      { $set: { status: "expired" } }
    );
    return result.modifiedCount;
  }
}

export const featuredListingRepository = new FeaturedListingRepository();
