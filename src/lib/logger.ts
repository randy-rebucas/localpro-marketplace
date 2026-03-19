/**
 * Structured logging with Pino.
 *
 * - Production: JSON output (default Pino behaviour)
 * - Development: JSON output to stdout
 *
 * Usage:
 *   import { logger, createLogger } from "@/lib/logger";
 *   const log = createLogger("email");
 *   log.info({ to }, "Email sent");
 */

import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino/file", options: { destination: 1 } }
      : undefined,
});

/**
 * Create a child logger scoped to a module name.
 * The `module` field is included in every log entry.
 */
export function createLogger(name: string) {
  return logger.child({ module: name });
}
