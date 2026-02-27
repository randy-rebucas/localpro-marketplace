/**
 * Next.js instrumentation hook.
 * Initialises Sentry on both Node.js (server) and Edge runtimes.
 *
 * To activate:
 *   pnpm add @sentry/nextjs
 *   Set SENTRY_DSN in your environment
 *   Then uncomment the import blocks below.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // await import("../sentry.edge.config");
  }
}

export const onRequestError =
  // Uncomment after installing @sentry/nextjs:
  // (await import("@sentry/nextjs")).captureRequestError;
  undefined;
