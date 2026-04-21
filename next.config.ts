import type { NextConfig } from "next";
import BundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // L-6: Prevent Adobe Flash/PDF plugins from loading cross-domain policy files
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // L-5: Lock down payment and USB APIs in addition to camera/mic
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // NOTE: 'unsafe-inline' and 'unsafe-eval' are required for Next.js HMR in dev and some third-party libraries.
      // PRODUCTION: Uses nonce-based CSP via middleware.ts (src/middleware.ts) for strict security without unsafe directives.
      // DEV: Allows unsafe-inline/eval to support HMR without middleware overhead.
      // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://js.paymongo.com https://www.googletagmanager.com https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://vercel.live https://*.vercel.live",
      "font-src 'self' data: https://fonts.gstatic.com https://vercel.live https://*.vercel.live",
      "img-src 'self' data: blob: https://res.cloudinary.com https://maps.googleapis.com https://maps.gstatic.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com https://graph.facebook.com https://platform-lookaside.fbsbx.com https://vercel.live https://*.vercel.live https://api.qrserver.com",
      "connect-src 'self' https://api.paymongo.com https://maps.googleapis.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://vitals.vercel-insights.com https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
      "frame-src https://js.paymongo.com https://checkout.paymongo.com https://www.googletagmanager.com https://vercel.live https://*.vercel.live",
      // M-8: CSP violation reporting — events are logged via /api/csp-report and forwarded to Sentry
      "report-uri /api/csp-report",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  experimental: {
    // Tree-shake icon and chart libraries — removes unused exports from the bundle
    optimizePackageImports: ["lucide-react", "recharts"],
    // NOTE: PPR (cacheComponents) conflicts with `export const dynamic = "force-dynamic"` on SSE routes.
    // Streaming via <Suspense> already provides the main performance benefit without enabling this flag.

    // Disable the client-side Router Cache for dynamic routes so that paginated
    // admin pages always serve fresh data on navigation.
    staleTimes: {
      dynamic: 0,
    },
  },

  async rewrites() {
    return {
      beforeFiles: [
        // Map /blog/feed.xml → /blog/feed and /blog/sitemap.xml → /blog/sitemap
        // This allows search engines to see proper .xml extensions while keeping routes clean
        {
          source: "/blog/feed.xml",
          destination: "/blog/feed",
        },
        {
          source: "/blog/sitemap.xml",
          destination: "/blog/sitemap",
        },
      ],
    };
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Service worker must never be cached and must be served as JS
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },

  images: {
    // Serve AVIF (≈50% smaller than WebP) with WebP fallback
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for 7 days (default is 60 s)
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "maps.gstatic.com" },
    ],
  },

  webpack: (config, { isServer }) => {
    // Tree-shake Sentry debug logging from production bundles
    config.optimization = {
      ...config.optimization,
      treeshake: { removeDebugLogging: true },
    };

    // Exclude jsdom and isomorphic-dompurify from server bundle
    // These cause ESM/CommonJS issues in SSR/Lambda environments
    if (isServer) {
      config.externals = {
        ...config.externals,
        jsdom: "jsdom",
        "isomorphic-dompurify": "isomorphic-dompurify",
      };
    }

    return config;
  },
};

const withAnalyzer = withBundleAnalyzer(nextConfig);

export default withSentryConfig(withAnalyzer, {
  // Sentry organisation and project (set in CI / Vercel env)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Upload source maps in CI builds only; keep them off in local dev
  sourcemaps: { disable: process.env.CI !== "true" },
  // Suppress noisy Sentry build output
  silent: true,
  autoInstrumentServerFunctions: true,
});
