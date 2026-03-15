import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Suppress noisy Next.js framework internals that are not real errors
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
  enabled: !!process.env.SENTRY_DSN,
});
