import User from "@/models/User";
import type { UserDocument } from "@/models/User";
import { BaseRepository } from "./base.repository";

export class UserRepository extends BaseRepository<UserDocument> {
  constructor() {
    super(User);
  }

  /** Includes password field for auth comparison. */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    await this.connect();
    return User.findOne({ email }).select("+password");
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    await this.connect();
    return User.findOne({ email }).lean() as unknown as UserDocument | null;
  }

  async findAll(filter: Record<string, unknown> = {}): Promise<UserDocument[]> {
    await this.connect();
    return User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean() as unknown as UserDocument[];
  }

  async updateUser(
    id: string,
    updates: { isVerified?: boolean; isSuspended?: boolean }
  ): Promise<UserDocument | null> {
    return this.updateById(id, updates);
  }
}

export const userRepository = new UserRepository();
