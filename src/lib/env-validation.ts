/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at application startup.
 * Prevents runtime errors from missing or misconfigured environment variables.
 */

import { z } from "zod";

/**
 * Define the environment variable schema
 */
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().url("MONGODB_URI must be a valid MongoDB connection URI"),

  // Authentication
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),

  // Email
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required for email notifications"),

  // Payments (PayMongo - optional but logged if missing)
  PAYMONGO_SECRET_KEY: z.string().optional(),
  PAYMONGO_WEBHOOK_SECRET: z.string().optional(),

  // Payments (PayPal - optional)
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),

  // Storage
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Maps & Location
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),

  // SMS
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),

  // Cron Jobs
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required for internal cron endpoints"),

  // Redis (Rate limiting, cache)
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),

  // Internal
  NEXT_INTERNAL_URL: z.string().optional(),
});

export type Environment = z.infer<typeof envSchema>;

/**
 * Validate environment variables and throw on errors
 */
export function validateEnvironment(): Environment {
  try {
    const env = envSchema.parse(process.env);
    return env as Environment;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => {
          const path = err.path.join(".");
          const message = err.message;
          return `  • ${path}: ${message}`;
        })
        .join("\n");

      throw new Error(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env.local or .env.production file.`
      );
    }
    throw error;
  }
}

/**
 * Validate and warn about optional configurations
 */
export function validateOptionalConfig(env: Environment): {
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check payment providers
  if (!env.PAYMONGO_SECRET_KEY) {
    warnings.push("PayMongo integration disabled (PAYMONGO_SECRET_KEY not set) — escrow payments will be simulated");
  }

  if (env.PAYMONGO_SECRET_KEY && !env.PAYMONGO_WEBHOOK_SECRET) {
    errors.push("PAYMONGO_WEBHOOK_SECRET is required when PAYMONGO_SECRET_KEY is set");
  }

  // Check storage
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) {
    warnings.push("Cloudinary integration incomplete — file uploads may fail");
  }

  // Check location services
  if (!env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    warnings.push("Google Maps API key not configured — location features limited");
  }

  // Check SMS
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    warnings.push("Twilio SMS not configured — SMS OTP verification unavailable");
  }

  // Check Redis
  if (!env.UPSTASH_REDIS_REST_URL) {
    warnings.push("Upstash Redis not configured — rate limiting and caching will use in-memory storage");
  }

  // Check Sentry
  if (!env.SENTRY_DSN && env.NODE_ENV === "production") {
    warnings.push("Sentry not configured for production — error monitoring unavailable");
  }

  return { warnings, errors };
}

/**
 * Log validation results
 */
export function logValidationResults(
  env: Environment,
  results: ReturnType<typeof validateOptionalConfig>
): void {
  console.log(
    `\n=== Environment Validation ===\n` +
    `Environment: ${env.NODE_ENV}\n` +
    `App URL: ${env.NEXT_PUBLIC_APP_URL}\n` +
    `Database: ${env.MONGODB_URI.replace(/:[^:]*@/, ":***@")} (masked)\n`
  );

  if (results.errors.length > 0) {
    console.error("\n❌ Configuration Errors:");
    results.errors.forEach((err) => console.error(`  • ${err}`));
  }

  if (results.warnings.length > 0) {
    console.warn("\n⚠️  Configuration Warnings:");
    results.warnings.forEach((warn) => console.warn(`  • ${warn}`));
  }

  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log("\n✅ All environment variables validated successfully\n");
  }
}

/**
 * Full validation (run at application startup)
 */
export function validateAllEnvironment(): void {
  const env = validateEnvironment();
  const results = validateOptionalConfig(env);

  logValidationResults(env, results);

  if (results.errors.length > 0) {
    throw new Error("Fatal configuration errors detected. See logs above.");
  }
}
