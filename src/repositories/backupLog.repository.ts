import BackupLog, { type BackupLogDocument, type BackupTrigger } from "@/models/BackupLog";
import { BaseRepository } from "./base.repository";

export interface CreateBackupLogInput {
  type: "atlas_snapshot" | "json_export";
  status: "pending" | "completed" | "failed";
  triggeredBy: BackupTrigger;
  adminId?: string;
  description?: string;
}

export interface UpdateBackupLogInput {
  status?: "pending" | "completed" | "failed";
  snapshotId?: string;
  sizeBytes?: number;
  error?: string;
  completedAt?: Date;
}

export class BackupLogRepository extends BaseRepository<BackupLogDocument> {
  constructor() {
    super(BackupLog);
  }

  async createLog(input: CreateBackupLogInput): Promise<BackupLogDocument> {
    return this.create(input);
  }

  async updateLog(id: string, update: UpdateBackupLogInput): Promise<BackupLogDocument | null> {
    return this.updateById(id, { $set: update });
  }

  async listRecent(limit = 20): Promise<BackupLogDocument[]> {
    await this.connect();
    return BackupLog.find({}).sort({ createdAt: -1 }).limit(limit).lean() as unknown as BackupLogDocument[];
  }
}

export const backupLogRepository = new BackupLogRepository();
