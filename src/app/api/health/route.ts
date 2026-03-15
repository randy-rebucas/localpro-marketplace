import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

/**
 * GET /api/health
 *
 * Lightweight health-check endpoint for uptime monitors and load balancers.
 * Returns HTTP 200 when the application and database are operational,
 * or HTTP 503 when the database connection cannot be established.
 *
 * Register this URL in: Better Uptime, UptimeRobot, Vercel monitoring, etc.
 */
export async function GET() {
  const start = Date.now();

  try {
    await connectDB();

    // Quick DB ping — resolves in < 5 ms on a healthy connection
    await mongoose.connection.db?.command({ ping: 1 });

    return NextResponse.json(
      {
        status:  "ok",
        db:      "connected",
        latency: `${Date.now() - start}ms`,
        ts:      new Date().toISOString(),
        version: process.env.npm_package_version ?? "unknown",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[HEALTH] Database ping failed:", err);

    return NextResponse.json(
      {
        status:  "error",
        db:      "disconnected",
        error:   err instanceof Error ? err.message : "unknown error",
        ts:      new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

// Allow search engines and monitors to cache nothing
export const dynamic = "force-dynamic";
