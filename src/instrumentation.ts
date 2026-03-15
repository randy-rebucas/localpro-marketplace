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
    await import("../sentry.server.config");
  }

  // Edge runtime uses the same server config (no Node APIs needed)
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.server.config");
  }
}

export const onRequestError = async (
  ...args: Parameters<(typeof import("@sentry/nextjs"))["captureRequestError"]>
) => {
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
};
