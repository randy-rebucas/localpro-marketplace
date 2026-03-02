import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your LocalPro account to post jobs, manage quotes, and connect with trusted service providers.",
};

export default function LoginPage() {
  return <LoginForm />;
}
