import mongoose, { Schema, Document, Model } from "mongoose";

export interface SkillDocument extends Document {
  name: string;       // lowercase-normalised unique name
  label: string;      // display-form (original casing)
  usageCount: number; // bumped every time a provider saves it
}

const SkillSchema = new Schema<SkillDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Text index for fast prefix search
SkillSchema.index({ name: "text", label: "text" });

/**
 * Pre-built seed list of common local-service trades.
 * Inserted once via SkillRepository.seed() on first API call.
 */
export const SKILL_SEEDS: string[] = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Welding",
  "Masonry",
  "Tiling",
  "Roofing",
  "HVAC",
  "Air Conditioning Repair",
  "Refrigerator Repair",
  "Washing Machine Repair",
  "TV Repair",
  "Appliance Repair",
  "Computer Repair",
  "Phone Repair",
  "Landscaping",
  "Lawn Care",
  "Tree Trimming",
  "Pest Control",
  "Cleaning",
  "Deep Cleaning",
  "Window Cleaning",
  "Laundry",
  "Ironing",
  "Cooking",
  "Catering",
  "Babysitting",
  "Elderly Care",
  "Pet Care",
  "Dog Walking",
  "Tutoring",
  "Photography",
  "Videography",
  "Graphic Design",
  "Web Design",
  "Data Entry",
  "Accounting",
  "Driving",
  "Delivery",
  "Moving",
  "Hauling",
  "Welding",
  "Auto Repair",
  "Motorcycle Repair",
  "Car Wash",
  "Security",
  "Event Planning",
  "Tailoring",
  "Shoe Repair",
];

const Skill: Model<SkillDocument> =
  mongoose.models.Skill ?? mongoose.model<SkillDocument>("Skill", SkillSchema);

export default Skill;
