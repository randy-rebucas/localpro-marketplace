import { Suspense } from "react";
import Link from "next/link";
import AuthRightPanel from "./AuthRightPanel";

function AuthCardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-44 rounded bg-slate-200" />
      <div className="h-4 w-56 rounded bg-slate-100" />
      <div className="space-y-3 pt-4">
        <div className="h-11 rounded-xl bg-slate-100" />
        <div className="h-11 rounded-xl bg-slate-100" />
        <div className="h-11 rounded-xl bg-emerald-100" />
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#eef1f4] p-3 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1180px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:min-h-[calc(100vh-3rem)]">
        <div className="w-full p-6 sm:p-10 lg:w-[52%] lg:p-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2"
            aria-label="LocalPro — home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static public branding */}
            <img
              src="/logo-only.png"
              alt=""
              aria-hidden
              className="h-8 w-auto object-contain"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- static public branding */}
            <img
              src="/logo-text.png"
              alt="LocalPro"
              className="h-7 w-auto object-contain"
            />
          </Link>
          <Suspense fallback={<AuthCardSkeleton />}>
            {children}
          </Suspense>
        </div>
        <AuthRightPanel />
      </div>
    </div>
  );
}
