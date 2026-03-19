import { z } from "zod";

// ── Reusable skill entry schema ─────────────────────────────────────────────
// Used by: provider profile, admin user creation, PESO referrals
export const SkillEntrySchema = z.object({
  skill: z.string().min(1).max(100),
  yearsExperience: z.number().int().min(0).max(50).default(0),
  hourlyRate: z.string().max(20).default(""),
});

export type SkillEntry = z.infer<typeof SkillEntrySchema>;

// ── Login schema ────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ── Registration schema ─────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number"
    ),
  role: z.enum(["client", "provider"]),
  referralCode: z.string().max(12).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ── Job creation schema ─────────────────────────────────────────────────────
// Note: kept here for shared use; the canonical version lives in the jobs API route.
// If the route schema diverges (e.g. adding fields), update both or import from here.
