import * as fs from "fs";
import * as path from "path";

/**
 * Vitest Setup: Load .env.local for test environment
 * 
 * Since vitest runs in Node.js (not Next.js), we need to manually load environment variables
 * from .env.local before any tests run.
 */

function loadEnvFile(envPath: string): void {
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️ .env.local not found at ${envPath}`);
    return;
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const lines = envContent.split("\n");

  for (const line of lines) {
    // Skip comments and empty lines
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    const [key, ...valueParts] = line.split("=");
    if (!key || !valueParts.length) {
      continue;
    }

    let value = valueParts.join("=").trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Only set if not already defined (allow overrides via process.env)
    if (!(key.trim() in process.env)) {
      process.env[key.trim()] = value;
    }
  }

  console.log("✓ Loaded environment variables from .env.local");
}

// Load .env.local relative to the project root
const projectRoot = path.resolve(__dirname);
const envPath = path.join(projectRoot, ".env.local");
loadEnvFile(envPath);
