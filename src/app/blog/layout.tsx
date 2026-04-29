import type { Metadata } from "next";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: { default: "Blog | LocalPro", template: "%s | LocalPro Blog" },
  description: "Practical tips, expert advice, and stories to help you make the most of local services.",
  alternates: { canonical: `${APP_URL}/blog` },
  openGraph: {
    title: "Blog | LocalPro",
    description: "Practical tips, expert advice, and stories to help you make the most of local services.",
    url: `${APP_URL}/blog`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
