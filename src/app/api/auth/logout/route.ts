import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";
import { withHandler } from "@/lib/utils";

export const POST = withHandler(async () => {
  const response = NextResponse.json({ message: "Logged out successfully" });
  clearAuthCookies(response);
  return response;
});
