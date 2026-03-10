import type { Metadata } from "next";
import LoginForm from "./LoginForm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.localpro.asia";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your LocalPro account to post jobs, manage quotes, and connect with verified local service providers in the Philippines.",
  alternates: { canonical: `${APP_URL}/login` },
  openGraph: {
    title: "Sign In | LocalPro",
    description: "Sign in to your LocalPro account.",
    url: `${APP_URL}/login`,
    siteName: "LocalPro",
    type: "website",
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
