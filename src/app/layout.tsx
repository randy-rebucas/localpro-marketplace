import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import CookieConsent from "@/components/shared/CookieConsent";
import JsonLd from "@/components/shared/JsonLd";
import PwaSetup from "@/components/pwa/PwaSetup";
import MetaPixelNoscript from "@/components/analytics/MetaPixel";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",   // show system font instantly; swap once Inter is loaded
  variable: "--font-inter",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: "LocalPro",
  title: {
    default: "LocalPro — Hire Trusted Local Service Professionals",
    template: "%s | LocalPro",
  },
  description:
    "LocalPro is a trusted marketplace for local service professionals. Post a job, receive quotes from KYC-verified providers, and pay securely with escrow protection. Serving the Philippines and beyond.",
  keywords: [
    // Global service marketplace
    "hire local service professionals",
    "local service marketplace",
    "on-demand home services",
    "verified service providers",
    "escrow payment marketplace",
    "freelance service platform",
    "home repair professionals",
    "trusted local contractors",
    // Trade categories (global)
    "plumber near me",
    "electrician near me",
    "house cleaning service",
    "carpenter for hire",
    "painter contractor",
    "aircon repair service",
    "handyman service",
    "construction contractor",
    "landscaping service",
    "pest control service",
    // Platform value props
    "post a job online",
    "get service quotes",
    "KYC verified tradespeople",
    "escrow payment protection",
    "rated and reviewed contractors",
    "background checked professionals",
    // Philippines local
    "service providers Philippines",
    "hire professionals Philippines",
    "home services Philippines",
    "LocalPro Philippines",
    "Ormoc City services",
    "Visayas service marketplace",
    "trabaho Philippines",
  ],
  authors: [{ name: "LocalPro", url: APP_URL }],
  creator: "LocalPro",
  publisher: "LocalPro",
  category: "Marketplace",
  alternates: { canonical: APP_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: APP_URL,
    siteName: "LocalPro",
    title: "LocalPro — Hire Trusted Local Service Professionals",
    description:
      "Post jobs, receive quotes from KYC-verified providers, and pay securely with escrow protection. The trusted marketplace for local service professionals.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "LocalPro — Hire Trusted Local Service Professionals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@localpro",
    creator: "@localpro",
    title: "LocalPro — Hire Trusted Local Service Professionals",
    description:
      "Post jobs, receive quotes from KYC-verified providers, and pay securely with escrow protection.",
    images: ["/api/og"],
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${inter.variable} h-full`}>
      <head>
        <JsonLd />
      </head>
      <body className="font-sans h-full">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {process.env.NEXT_PUBLIC_GTM_ID && (
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
                height="0" width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>
          )}
          <MetaPixelNoscript />
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <Script
              id="google-maps"
              src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
              strategy="afterInteractive"
            />
          )}
          {children}
          {/* NextIntlClientProvider makes translations available to client components */}
        </NextIntlClientProvider>
        <PwaSetup />
        <CookieConsent />
        <Analytics />
        <SpeedInsights />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1e293b",
              color: "#f8fafc",
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#22c55e", secondary: "#f8fafc" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#f8fafc" },
            },
          }}
        />
      </body>
    </html>
  );
}
