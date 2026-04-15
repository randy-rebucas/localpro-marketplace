import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: {
    default: "Blog | LocalPro",
    template: "%s | LocalPro Blog",
  },
  description: "Insights, updates, and stories from the LocalPro community",
  alternates: { canonical: `${APP_URL}/blog` },
  openGraph: {
    title: "Blog | LocalPro",
    description: "Insights, updates, and stories from the LocalPro community",
    url: `${APP_URL}/blog`,
    siteName: "LocalPro",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LocalPro Blog",
    description: "Insights, updates, and stories from the LocalPro community",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-50">
      {/* Blog Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/10 bg-white/5 backdrop-blur-lg supports-[backdrop-filter]:bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Back Link */}
          <Link
            href="/blog"
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/50 transition-all duration-200">
              <span className="text-white font-bold text-lg">📝</span>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              LocalPro Blog
            </span>
          </Link>

          {/* Back to Main Navigation */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-64px)]">
        {children}
      </main>

      {/* Blog Footer */}
      <footer className="border-t border-slate-200/10 bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* About */}
            <div>
              <h3 className="font-bold text-white mb-4">About LocalPro Blog</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Insights, tips, and stories from the LocalPro community. Learn how to find trusted service professionals and grow your business.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/blog" className="text-slate-400 hover:text-white text-sm transition-colors">
                    Latest Articles
                  </Link>
                </li>
                <li>
                  <Link href="/blog/category/tutorial" className="text-slate-400 hover:text-white text-sm transition-colors">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link href="/blog/category/tips-tricks" className="text-slate-400 hover:text-white text-sm transition-colors">
                    Tips & Tricks
                  </Link>
                </li>
                <li>
                  <Link href="/blog/feed.xml" className="text-slate-400 hover:text-white text-sm transition-colors">
                    RSS Feed
                  </Link>
                </li>
              </ul>
            </div>

            {/* Subscribe */}
            <div>
              <h3 className="font-bold text-white mb-4">Stay Updated</h3>
              <p className="text-slate-400 text-sm mb-4">
                Subscribe to our RSS feed to get new articles delivered to your reader.
              </p>
              <a
                href="/blog/feed.xml"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200"
              >
                <span>📡</span> Subscribe to Feed
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-slate-200/10">
            <p className="text-slate-400 text-xs text-center">
              © {new Date().getFullYear()} LocalPro. All rights reserved. |{" "}
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              {" "} • {" "}
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
