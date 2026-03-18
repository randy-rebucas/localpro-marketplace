import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-8xl font-black text-slate-200 select-none">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{t("heading")}</h1>
        <p className="mt-3 text-slate-500 text-sm">
          {t("description")}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block btn-primary"
        >
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
