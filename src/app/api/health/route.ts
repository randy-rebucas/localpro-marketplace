import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Redis } from "@upstash/redis";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * GET /api/health
 *
 * Multi-service health-check endpoint for uptime monitors and load balancers.
 *
 * HTTP 200  — all services operational
 * HTTP 207  — partial degradation (some services down, app still running)
 * HTTP 503  — critical failure (MongoDB unreachable)
 *
 * Register this URL in: Better Uptime, UptimeRobot, Vercel monitoring, etc.
 */

type ServiceStatus = "ok" | "degraded" | "down";

interface ServiceCheck {
  status: ServiceStatus;
  latencyMs: number;
  error?: string;
}

// Configure Cloudinary once at module load, not per request
const cloudinaryConfigured =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

async function checkMongo(): Promise<ServiceCheck> {
  const t = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db?.command({ ping: 1 });
    return { status: "ok", latencyMs: Date.now() - t };
  } catch (err) {
    console.error("[health] MongoDB check failed:", err);
    return { status: "down", latencyMs: Date.now() - t, error: "connection failed" };
  }
}

async function checkCloudinary(): Promise<ServiceCheck> {
  const t = Date.now();
  if (!cloudinaryConfigured) {
    return { status: "degraded", latencyMs: 0, error: "not configured" };
  }
  try {
    await cloudinary.api.ping();
    return { status: "ok", latencyMs: Date.now() - t };
  } catch (err) {
    console.error("[health] Cloudinary check failed:", err);
    return { status: "degraded", latencyMs: Date.now() - t, error: "connection failed" };
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  const t = Date.now();
  const configured =
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!configured) {
    return { status: "degraded", latencyMs: 0, error: "not configured" };
  }

  try {
    const redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const pong = await redis.ping();
    if (pong !== "PONG") throw new Error("unexpected PING response");
    return { status: "ok", latencyMs: Date.now() - t };
  } catch (err) {
    console.error("[health] Redis check failed:", err);
    return { status: "degraded", latencyMs: Date.now() - t, error: "connection failed" };
  }
}

export const GET = withHandler(async (req: NextRequest) => {
  // IP-based rate limit — this endpoint is unauthenticated but fires 3 I/O ops per call
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`health:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const [db, cdn, redis] = await Promise.all([
    checkMongo(),
    checkCloudinary(),
    checkRedis(),
  ]);

  const services = { db, cloudinary: cdn, redis };

  const overallStatus: ServiceStatus =
    db.status === "down"
      ? "down"
      : Object.values(services).some((s) => s.status !== "ok")
      ? "degraded"
      : "ok";

  const httpStatus = db.status === "down" ? 503 : overallStatus === "degraded" ? 207 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      services,
      ts: new Date().toISOString(),
    },
    {
      status: httpStatus,
      headers: { "Cache-Control": "no-store, no-cache" },
    }
  );
});

export const dynamic = "force-dynamic";
