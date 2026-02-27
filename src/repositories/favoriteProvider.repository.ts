import FavoriteProvider from "@/models/FavoriteProvider";
import type { FavoriteProviderDocument } from "@/models/FavoriteProvider";
import { BaseRepository } from "./base.repository";

export class FavoriteProviderRepository extends BaseRepository<FavoriteProviderDocument> {
  constructor() {
    super(FavoriteProvider);
  }

  async findByClient(clientId: string): Promise<FavoriteProviderDocument[]> {
    await this.connect();
    return FavoriteProvider.find({ clientId })
      .sort({ createdAt: -1 })
      .populate("providerId", "name email")
      .lean() as unknown as FavoriteProviderDocument[];
  }

  async isFavorite(clientId: string, providerId: string): Promise<boolean> {
    return this.exists({ clientId, providerId } as never);
  }

  async addFavorite(
    clientId: string,
    providerId: string
  ): Promise<FavoriteProviderDocument> {
    await this.connect();
    // upsert — safe if already exists
    const doc = await FavoriteProvider.findOneAndUpdate(
      { clientId, providerId },
      { clientId, providerId },
      { upsert: true, new: true }
    ).lean();
    return doc as unknown as FavoriteProviderDocument;
  }

  async removeFavorite(clientId: string, providerId: string): Promise<void> {
    await this.connect();
    await FavoriteProvider.deleteOne({ clientId, providerId });
  }

  async getFavoriteProviderIds(clientId: string): Promise<string[]> {
    await this.connect();
    const docs = await FavoriteProvider.find({ clientId }).select("providerId").lean();
    return docs.map((d) => (d as unknown as { providerId: { toString(): string } }).providerId.toString());
  }
}

export const favoriteProviderRepository = new FavoriteProviderRepository();
