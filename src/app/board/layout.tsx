import type { Metadata } from "next";
import { Outfit } from "next/font/google";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-board",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Live Job Board | LocalPro — Open Service Jobs in Ormoc City",
  description:
    "Browse open service jobs in Ormoc City and its barangays posted on LocalPro. Real-time LGU-level job board for service professionals. Updated live every 60 seconds.",
  keywords: [
    "service jobs Ormoc City",
    "open jobs Ormoc",
    "job board Ormoc",
    "LocalPro job board",
    "home service jobs Ormoc",
    "local jobs Leyte",
    "LGU jobs Ormoc",
    "barangay service jobs",
  ],
  alternates: { canonical: `${APP_URL}/board` },
  openGraph: {
    title: "Live Job Board | LocalPro — Open Service Jobs in Ormoc City",
    description: "Real-time live job board for service professionals in Ormoc City. LGU-level view of open jobs near you.",
    url: `${APP_URL}/board`,
    siteName: "LocalPro",
    type: "website",
    images: [{ url: `/api/og?title=Live+Job+Board&description=Open+jobs+in+Ormoc+City+%E2%80%94+updated+live&tag=LGU+Board`, width: 1200, height: 630, alt: "LocalPro Live Job Board" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Job Board | LocalPro",
    description: "Browse open service jobs in Ormoc City — updated live.",
    images: [`/api/og?title=Live+Job+Board&description=Open+jobs+in+Ormoc+City+%E2%80%94+updated+live&tag=LGU+Board`],
  },
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${outfit.variable} min-h-screen w-full bg-[#0d2340] text-white antialiased overflow-hidden`}
      style={{ fontFamily: "var(--font-board, sans-serif)" }}
    >
      {children}
    </div>
  );
}
