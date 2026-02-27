import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyEmailForm from "./VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to activate your LocalPro account.",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
