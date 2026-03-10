import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join LocalPro for free — post jobs and hire KYC-verified local service providers, or sign up as a provider and grow your service business in the Philippines.",
  alternates: { canonical: `${APP_URL}/register` },
  openGraph: {
    title: "Create Account | LocalPro",
    description: "Join LocalPro free — hire verified providers or offer your services.",
    url: `${APP_URL}/register`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
