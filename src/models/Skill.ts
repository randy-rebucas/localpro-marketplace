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
  // Plumbing
  "Plumbing",
  "Pipe Installation",
  "Leak Repair",
  "Drain Cleaning",
  "Water Heater Installation",
  "Toilet Repair",
  "Faucet Repair",
  "Sewer Line Repair",
  "Water Pressure Fix",

  // Electrical
  "Electrical",
  "Wiring Installation",
  "Circuit Breaker Repair",
  "Outlet Installation",
  "Lighting Installation",
  "Electrical Troubleshooting",
  "Panel Upgrade",
  "Generator Installation",
  "CCTV Installation",
  "Solar Panel Installation",

  // Cleaning
  "Cleaning",
  "Deep Cleaning",
  "Window Cleaning",
  "Carpet Cleaning",
  "Upholstery Cleaning",
  "Post-Construction Cleaning",
  "Office Cleaning",
  "Laundry",
  "Ironing",
  "Housekeeping",
  "Disinfection & Sanitation",

  // Landscaping
  "Landscaping",
  "Lawn Care",
  "Tree Trimming",
  "Garden Design",
  "Irrigation Installation",
  "Soil & Fertilization",
  "Pest Control",
  "Pressure Washing",

  // Carpentry
  "Carpentry",
  "Furniture Making",
  "Cabinet Installation",
  "Door & Window Framing",
  "Deck Building",
  "Wood Repair",
  "Flooring Installation",
  "Hardwood Flooring",
  "Laminate Flooring",

  // Painting
  "Painting",
  "Interior Painting",
  "Exterior Painting",
  "Wallpaper Installation",
  "Epoxy Floor Coating",
  "Surface Preparation",
  "Texture Painting",

  // Roofing
  "Roofing",
  "Roof Installation",
  "Roof Repair",
  "Waterproofing",
  "Roof Inspection",
  "Gutters & Drainage",
  "Metal Roofing",

  // HVAC
  "HVAC",
  "Air Conditioning Repair",
  "Air Conditioning Installation",
  "Refrigerator Repair",
  "Ventilation System Repair",
  "Duct Cleaning",
  "Heating System Repair",

  // Moving
  "Moving",
  "Packing & Unpacking",
  "Furniture Assembly",
  "Hauling",
  "Storage Solutions",

  // Handyman
  "Handyman",
  "General Repairs",
  "Appliance Installation",
  "TV Mounting",
  "Shelving & Storage",
  "Door Lock Installation",
  "Caulking & Sealing",

  // Masonry & Tiling
  "Masonry",
  "Tiling",
  "Tile Setting",
  "Brickwork",
  "Concrete Work",
  "Stone Masonry",
  "Plastering",
  "Rebar & Steelwork",

  // Welding & Fabrication
  "Welding",
  "Metal Fabrication",
  "Sheet Metal Work",
  "Steel Cutting",
  "Gate & Fence Fabrication",
  "Structural Welding",

  // Automotive & Mechanics
  "Auto Repair",
  "Car Diagnosis & Troubleshooting",
  "Oil Change & Maintenance",
  "Brake Repair",
  "Tire Change & Rotation",
  "Engine Repair",
  "Motorcycle Repair",
  "Diesel Mechanic",
  "Car Wash & Detailing",
  "Auto Electrical",
  "Air Conditioning (Auto)",

  // Mechanical & Industrial
  "Machinist",
  "CNC Operation",
  "Millwright",
  "Industrial Equipment Repair",
  "Hydraulic System Repair",
  "Conveyor System Maintenance",
  "Elevator Maintenance",
  "Boiler Operation",

  // IT & Technology
  "Computer Repair",
  "Laptop Repair",
  "Network Setup",
  "Wi-Fi Installation",
  "IT Support",
  "Data Recovery",
  "Software Troubleshooting",
  "CCTV & Security Systems",
  "Smart Home Installation",
  "Web Design",
  "Graphic Design",
  "Data Entry",

  // Electronics & Telecom
  "Phone Repair",
  "TV Repair",
  "Appliance Repair",
  "Electronics Repair",
  "Telecommunications Installation",
  "Fiber Optic Installation",

  // Food & Culinary
  "Cooking",
  "Catering",
  "Baking & Pastry",
  "Butchering",
  "Food Preparation",
  "Bartending",
  "Personal Chef",

  // Tailoring & Fashion
  "Tailoring",
  "Dressmaking",
  "Clothing Alterations",
  "Embroidery",
  "Shoe Repair",
  "Bag & Leather Repair",

  // Transportation & Logistics
  "Driving",
  "Delivery",
  "Courier Service",
  "Freight & Trucking",
  "Crane Operation",
  "Forklift Operation",
  "Motorbike Delivery",

  // Health & Medical
  "First Aid & Emergency Response",
  "Blood Pressure Monitoring",
  "Elderly Care",
  "Disability Assistance",
  "Home Nursing",
  "Medical Equipment Operation",
  "Pharmacy Assistance",

  // Safety & Security
  "Security Guard",
  "Fire Safety",
  "Security System Installation",
  "Alarm System Setup",

  // Beauty & Personal Care
  "Haircut & Styling",
  "Hair Coloring",
  "Barbering",
  "Makeup Artist",
  "Bridal Makeup",
  "Nail Art & Manicure",
  "Pedicure",
  "Massage Therapy",
  "Swedish Massage",
  "Shiatsu Massage",
  "Facial Treatment",
  "Waxing",
  "Eyelash Extension",
  "Eyebrow Threading",
  "Tattoo",

  // Pet Care & Grooming
  "Pet Grooming",
  "Dog Walking",
  "Pet Bathing",
  "Pet Sitting",
  "Veterinary Assistance",

  // Other / General
  "Babysitting",
  "Tutoring",
  "Photography",
  "Videography",
  "Event Planning",
  "Accounting",
  "Bookkeeping",
];

const Skill: Model<SkillDocument> =
  mongoose.models.Skill ?? mongoose.model<SkillDocument>("Skill", SkillSchema);

export default Skill;
