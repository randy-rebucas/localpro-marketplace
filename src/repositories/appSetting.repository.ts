import AppSetting from "@/models/AppSetting";
import type { AppSettingDocument } from "@/models/AppSetting";
import { BaseRepository } from "./base.repository";

export class AppSettingRepository extends BaseRepository<AppSettingDocument> {
  constructor() {
    super(AppSetting);
  }

  /** Returns all settings as a flat key→value record. */
  async findAllAsMap(): Promise<Record<string, unknown>> {
    await this.connect();
    const settings = await AppSetting.find().lean();
    return settings.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  }

  /**
   * Fetches a batch of settings by their keys in one query.
   * Returns a key→value map; missing keys are omitted.
   */
  async findByKeys(keys: string[]): Promise<Record<string, unknown>> {
    await this.connect();
    const settings = await AppSetting.find({ key: { $in: keys } }).lean();
    return settings.reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
  }

  /**
   * Upserts multiple settings at once.
   * `updatedBy` is stored on each document for audit purposes.
   * Returns the full settings map after the update.
   */
  async upsertMany(
    entries: Record<string, unknown>,
    updatedBy: string
  ): Promise<Record<string, unknown>> {
    await this.connect();
    await Promise.all(
      Object.entries(entries).map(([key, value]) =>
        AppSetting.findOneAndUpdate(
          { key },
          { $set: { value, updatedBy } },
          { upsert: true, new: true }
        )
      )
    );
    return this.findAllAsMap();
  }
}

export const appSettingRepository = new AppSettingRepository();
