/**
 * Sentry server-side configuration.
 * Activate by:
 *   1. pnpm add @sentry/nextjs
 *   2. Set SENTRY_DSN env var
 *   3. Uncomment the import in src/instrumentation.ts
 */
// import * as Sentry from "@sentry/nextjs";
//
// Sentry.init({
//   dsn: process.env.SENTRY_DSN,
//   tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
//   environment: process.env.NODE_ENV,
//   // Suppress noisy framework internals
//   ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
// });
