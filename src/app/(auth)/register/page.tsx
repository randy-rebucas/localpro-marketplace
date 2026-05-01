import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "We provide workers on demand — post jobs and hire KYC-verified local service providers, or sign up as a provider and grow your service business in the Philippines.",
  alternates: { canonical: `${APP_URL}/register` },
  openGraph: {
    title: "Create Account | LocalPro",
    description:
      "We provide workers on demand — hire verified providers or offer your services.",
    url: `${APP_URL}/register`,
    siteName: "LocalPro",
    type: "website",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const defaultRole = params.role === "provider" ? "provider" : "client";
  const refCode = typeof params.ref === "string" ? params.ref : "";
  return <RegisterForm defaultRole={defaultRole} refCode={refCode} />;
}
