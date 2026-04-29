import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "You're offline",
  description:
    "Your internet connection was lost. You can still use some cached features, or try again when you're back online.",
  alternates: { canonical: `${APP_URL}/offline` },
  robots: { index: false, follow: true },
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
