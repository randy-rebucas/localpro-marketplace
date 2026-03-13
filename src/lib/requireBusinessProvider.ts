import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Server-side auth guard for all provider business dashboard pages.
 * Redirects to /login if unauthenticated, to / if wrong role.
 * Returns the authenticated user.
 */
export async function requireBusinessProvider() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "provider") redirect("/");
  return user;
}
