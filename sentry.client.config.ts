/**
 * Sentry client-side (browser) configuration.
 * Activate by:
 *   1. pnpm add @sentry/nextjs
 *   2. Set SENTRY_DSN env var
 *   3. Add `withSentryConfig` wrapper in next.config.ts
 */
// import * as Sentry from "@sentry/nextjs";
//
// Sentry.init({
//   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
//   tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
//   replaysOnErrorSampleRate: 1.0,
//   replaysSessionSampleRate: 0.05,
//   integrations: [
//     Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
//   ],
// });
