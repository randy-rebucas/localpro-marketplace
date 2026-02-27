import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://js.paymongo.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://maps.googleapis.com https://maps.gstatic.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://www.google-analytics.com",
      "connect-src 'self' https://api.paymongo.com https://maps.googleapis.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net",
      "frame-src https://js.paymongo.com https://checkout.paymongo.com https://www.googletagmanager.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Tree-shake icon and chart libraries — removes unused exports from the bundle
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
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
};

export default nextConfig;
