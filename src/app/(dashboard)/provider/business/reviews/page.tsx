import type { Metadata } from "next";
import { requireBusinessProvider } from "@/lib/requireBusinessProvider";
import ReviewsClient from "./_components/ReviewsClient";

export const metadata: Metadata = { title: "Agency Reviews" };

export default async function ReviewsPage() {
  await requireBusinessProvider();
  return <ReviewsClient />;
}
