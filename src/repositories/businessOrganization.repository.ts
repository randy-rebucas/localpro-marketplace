import { Types } from "mongoose";
import { BaseRepository } from "./base.repository";
import BusinessOrganization, {
  BusinessOrganizationDocument,
} from "@/models/BusinessOrganization";
import "@/models/User";
import type { IBusinessOrganization } from "@/types";

class BusinessOrganizationRepository extends BaseRepository<BusinessOrganizationDocument> {
  constructor() {
    super(BusinessOrganization);
  }

  async findByOwner(ownerId: string): Promise<IBusinessOrganization | null> {
    await this.connect();
    return BusinessOrganization.findOne({ ownerId })
      .lean() as unknown as IBusinessOrganization | null;
  }

  async findOrgById(orgId: string): Promise<IBusinessOrganization | null> {
    await this.connect();
    return BusinessOrganization.findById(orgId)
      .lean() as unknown as IBusinessOrganization | null;
  }

  async createOrg(data: {
    ownerId: string;
    name: string;
    type: string;
    defaultMonthlyBudget?: number;
    logo?: string;
  }): Promise<IBusinessOrganization> {
    await this.connect();
    const doc = await BusinessOrganization.create(data);
    return doc.toObject() as unknown as IBusinessOrganization;
  }

  async addLocation(
    orgId: string,
    location: {
      label: string;
      address: string;
      coordinates?: { lat: number; lng: number };
      monthlyBudget?: number;
      alertThreshold?: number;
    }
  ): Promise<IBusinessOrganization | null> {
    await this.connect();
    return BusinessOrganization.findByIdAndUpdate(
      orgId,
      { $push: { locations: { ...location, isActive: true } } },
      { new: true }
    ).lean() as unknown as IBusinessOrganization | null;
  }

  async updateLocation(
    orgId: string,
    locationId: string,
    updates: Partial<{
      label: string;
      address: string;
      coordinates: { lat: number; lng: number };
      monthlyBudget: number;
      alertThreshold: number;
      isActive: boolean;
    }>
  ): Promise<IBusinessOrganization | null> {
    await this.connect();
    const setFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      setFields[`locations.$.${k}`] = v;
    }
    return BusinessOrganization.findOneAndUpdate(
      { _id: orgId, "locations._id": locationId },
      { $set: setFields },
      { new: true }
    ).lean() as unknown as IBusinessOrganization | null;
  }

  async removeLocation(
    orgId: string,
    locationId: string
  ): Promise<IBusinessOrganization | null> {
    await this.connect();
    return BusinessOrganization.findByIdAndUpdate(
      orgId,
      { $pull: { locations: { _id: locationId } } },
      { new: true }
    ).lean() as unknown as IBusinessOrganization | null;
  }

  async updateOrgDetails(
    orgId: string,
    data: Partial<{
      name: string;
      type: string;
      logo: string;
      defaultMonthlyBudget: number;
    }>
  ): Promise<IBusinessOrganization | null> {
    await this.connect();
    return BusinessOrganization.findByIdAndUpdate(orgId, { $set: data }, { new: true })
      .lean() as unknown as IBusinessOrganization | null;
  }

  /** Add a provider to the preferred list of a location. */
  async addPreferredProvider(
    orgId: string,
    locationId: string,
    providerId: string
  ): Promise<IBusinessOrganization | null> {
    await this.connect();
    return BusinessOrganization.findOneAndUpdate(
      { _id: orgId, "locations._id": locationId },
      { $addToSet: { "locations.$.preferredProviderIds": new Types.ObjectId(providerId) } },
      { new: true }
    ).lean() as unknown as IBusinessOrganization | null;
  }

  /** Remove a provider from the preferred list of a location. */
  async removePreferredProvider(
    orgId: string,
    locationId: string,
    providerId: string
  ): Promise<IBusinessOrganization | null> {
    await this.connect();
    return BusinessOrganization.findOneAndUpdate(
      { _id: orgId, "locations._id": locationId },
      { $pull: { "locations.$.preferredProviderIds": new Types.ObjectId(providerId) } },
      { new: true }
    ).lean() as unknown as IBusinessOrganization | null;
  }
}

export const businessOrganizationRepository = new BusinessOrganizationRepository();
