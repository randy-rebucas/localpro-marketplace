import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Script from "next/script";
import { GoogleTagManagerScript, GoogleTagManagerNoscript } from "@/components/analytics/GoogleTagManager";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",   // show system font instantly; swap once Inter is loaded
  variable: "--font-inter",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://localpro.ph";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "LocalPro — Find Local Service Providers",
    template: "%s | LocalPro",
  },
  description:
    "Connect with trusted local service providers. Post jobs, get quotes, and pay securely with escrow protection.",
  keywords: [
    "local service providers",
    "hire professionals",
    "home services",
    "freelance marketplace",
    "plumber",
    "electrician",
    "cleaning services",
    "Philippines services",
  ],
  authors: [{ name: "LocalPro" }],
  creator: "LocalPro",
  publisher: "LocalPro",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: APP_URL,
    siteName: "LocalPro",
    title: "LocalPro — Find Local Service Providers",
    description:
      "Connect with trusted local service providers. Post jobs, get quotes, and pay securely with escrow protection.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LocalPro — Find Local Service Providers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@localpro",
    title: "LocalPro — Find Local Service Providers",
    description:
      "Connect with trusted local service providers. Post jobs, get quotes, and pay securely with escrow protection.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="font-sans h-full">
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <GoogleTagManagerNoscript gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
        )}
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <GoogleTagManagerScript gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
        )}
        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          // &loading=async
          <Script
            id="google-maps"
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
            strategy="afterInteractive"
          /> 
        )}
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
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
