import { Suspense } from "react";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

function AuthCardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-32 bg-slate-200 rounded mx-auto" />
      <div className="h-4 w-48 bg-slate-100 rounded mx-auto" />
      <div className="space-y-3 mt-6">
        <div className="h-10 bg-slate-100 rounded-lg" />
        <div className="h-10 bg-slate-100 rounded-lg" />
        <div className="h-10 bg-primary/20 rounded-lg" />
      </div>
    </div>
  );
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-0">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur mb-4">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">
            <span className="text-primary-300">Local</span><span className="text-brand-400">Pro</span>
          </h1>
          </Link>
          <p className="text-primary-300 text-sm mt-1">
            {t("connecting")}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <Suspense fallback={<AuthCardSkeleton />}>
            {children}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
