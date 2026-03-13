import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAgencyStaff {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "worker" | "dispatcher" | "supervisor" | "finance";
  joinedAt: Date;
  /** Worker's share of the escrow payout (0 = use agency default). Range: 0–100 */
  workerSharePct: number;
}

export interface IAgencyPermit {
  title: string;
  url: string;
  status: "pending" | "verified" | "expired";
}

export interface IAgencyService {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  duration: string;
  isActive: boolean;
}

export interface IAgencyEquipment {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  serialNo: string;
  status: "available" | "in_use" | "maintenance" | "retired";
  assignedToId: mongoose.Types.ObjectId | null;
  notes: string;
}

export interface IAvailabilitySlot {
  day: number; // 0=Sun … 6=Sat
  open: boolean;
  startTime: string; // "08:00"
  endTime: string;   // "17:00"
}

export interface IAgencyProfile {
  _id: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  name: string;
  type: "agency" | "company" | "other";
  logo: string | null;
  banner: string | null;
  description: string;
  businessRegistrationNo: string;
  operatingHours: string;
  website: string;
  serviceAreas: string[];
  serviceCategories: string[];
  staff: IAgencyStaff[];
  services: IAgencyService[];
  equipment: IAgencyEquipment[];
  availability: IAvailabilitySlot[];
  maxConcurrentJobs: number;
  autoAcceptQuotes: boolean;
  /** Default % of escrow payout given to workers (0 = not configured). Range: 0–100 */
  defaultWorkerSharePct: number;
  compliance: {
    permits: IAgencyPermit[];
    insuranceUrl: string | null;
    insuranceStatus: "pending" | "verified" | "expired" | "none";
    tin: string;
    vat: string;
    taxStatus: "compliant" | "pending" | "not_provided";
  };
  // Subscription / billing
  plan: "starter" | "growth" | "pro" | "enterprise";
  planStatus: "active" | "past_due" | "cancelled";
  planActivatedAt: Date | null;
  planExpiresAt: Date | null;
  pendingPlan: string | null;
  pendingPlanSessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyProfileDocument
  extends Omit<IAgencyProfile, "_id">,
    Document {}

const StaffSubSchema = new Schema<IAgencyStaff>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: "User", required: true },
    role:           { type: String, enum: ["worker", "dispatcher", "supervisor", "finance"], default: "worker" },
    joinedAt:       { type: Date, default: () => new Date() },
    workerSharePct: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: true }
);

const PermitSubSchema = new Schema(
  {
    title:  { type: String, required: true, trim: true },
    url:    { type: String, default: "" },
    status: { type: String, enum: ["pending", "verified", "expired"], default: "pending" },
  },
  { _id: false }
);

const ServiceSubSchema = new Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    category:    { type: String, default: "", trim: true },
    minPrice:    { type: Number, default: 0, min: 0 },
    maxPrice:    { type: Number, default: 0, min: 0 },
    duration:    { type: String, default: "", trim: true },
    isActive:    { type: Boolean, default: true },
  },
  { _id: true }
);

const EquipmentSubSchema = new Schema(
  {
    name:         { type: String, required: true, trim: true, maxlength: 200 },
    type:         { type: String, default: "", trim: true },
    serialNo:     { type: String, default: "", trim: true },
    status:       { type: String, enum: ["available", "in_use", "maintenance", "retired"], default: "available" },
    assignedToId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes:        { type: String, default: "", trim: true, maxlength: 500 },
  },
  { _id: true }
);

const AvailabilitySubSchema = new Schema(
  {
    day:       { type: Number, required: true, min: 0, max: 6 },
    open:      { type: Boolean, default: true },
    startTime: { type: String, default: "08:00" },
    endTime:   { type: String, default: "17:00" },
  },
  { _id: false }
);

const AgencyProfileSchema = new Schema<AgencyProfileDocument>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name:                  { type: String, required: true, trim: true, maxlength: 200 },
    type:                  { type: String, enum: ["agency", "company", "other"], default: "agency" },
    logo:                  { type: String, default: null },
    banner:                { type: String, default: null },
    description:           { type: String, default: "", trim: true, maxlength: 2000 },
    businessRegistrationNo:{ type: String, default: "", trim: true },
    operatingHours:        { type: String, default: "", trim: true },
    website:               { type: String, default: "", trim: true },
    serviceAreas:          { type: [String], default: [] },
    serviceCategories:     { type: [String], default: [] },
    staff:                 { type: [StaffSubSchema], default: [] },
    services:              { type: [ServiceSubSchema], default: [] },
    equipment:             { type: [EquipmentSubSchema], default: [] },
    availability:          { type: [AvailabilitySubSchema], default: [] },
    maxConcurrentJobs:       { type: Number, default: 10, min: 1 },
    autoAcceptQuotes:        { type: Boolean, default: false },
    defaultWorkerSharePct:   { type: Number, default: 60, min: 0, max: 100 },
    compliance: {
      permits:         { type: [PermitSubSchema], default: [] },
      insuranceUrl:    { type: String, default: null },
      insuranceStatus: { type: String, enum: ["pending", "verified", "expired", "none"], default: "none" },
      tin:             { type: String, default: "", trim: true },
      vat:             { type: String, default: "", trim: true },
      taxStatus:       { type: String, enum: ["compliant", "pending", "not_provided"], default: "not_provided" },
    },
    // Subscription / billing
    plan:                { type: String, enum: ["starter", "growth", "pro", "enterprise"], default: "starter" },
    planStatus:          { type: String, enum: ["active", "past_due", "cancelled"], default: "active" },
    planActivatedAt:     { type: Date, default: null },
    planExpiresAt:       { type: Date, default: null },
    pendingPlan:         { type: String, default: null },
    pendingPlanSessionId:{ type: String, default: null },
  },
  { timestamps: true }
);

const AgencyProfile: Model<AgencyProfileDocument> =
  mongoose.models.AgencyProfile ??
  mongoose.model<AgencyProfileDocument>("AgencyProfile", AgencyProfileSchema);

export default AgencyProfile;
