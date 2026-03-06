import type { Metadata } from "next";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-board",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "LocalPro — Service Job Board",
  description: "Official LocalPro Service Job Board — browse open service jobs in your area.",
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${outfit.variable} min-h-screen w-full bg-[#0d2340] text-white antialiased overflow-hidden`}
      style={{ fontFamily: "var(--font-board, sans-serif)" }}
    >
      {children}
    </div>
  );
}
