import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Redis } from "@upstash/redis";

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

async function checkMongo(): Promise<ServiceCheck> {
  const t = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db?.command({ ping: 1 });
    return { status: "ok", latencyMs: Date.now() - t };
  } catch (err) {
    return { status: "down", latencyMs: Date.now() - t, error: (err as Error).message };
  }
}

async function checkCloudinary(): Promise<ServiceCheck> {
  const t = Date.now();
  const configured =
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET;

  if (!configured) return { status: "degraded", latencyMs: 0, error: "Cloudinary env vars not set" };

  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    await cloudinary.api.ping();
    return { status: "ok", latencyMs: Date.now() - t };
  } catch (err) {
    return { status: "degraded", latencyMs: Date.now() - t, error: (err as Error).message };
  }
}

async function checkRedis(): Promise<ServiceCheck> {
  const t = Date.now();
  const configured =
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!configured) return { status: "degraded", latencyMs: 0, error: "Upstash Redis env vars not set" };

  try {
    const redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const pong = await redis.ping();
    if (pong !== "PONG") throw new Error(`Unexpected PING response: ${pong}`);
    return { status: "ok", latencyMs: Date.now() - t };
  } catch (err) {
    return { status: "degraded", latencyMs: Date.now() - t, error: (err as Error).message };
  }
}

export async function GET() {
  const [db, cdn, redis] = await Promise.all([
    checkMongo(),
    checkCloudinary(),
    checkRedis(),
  ]);

  const services = { db, cloudinary: cdn, redis };

  // Overall status: down if MongoDB is down, degraded if any other service is not ok
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
}

// Allow search engines and monitors to cache nothing
export const dynamic = "force-dynamic";
