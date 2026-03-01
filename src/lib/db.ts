import mongoose from "mongoose";
import { attachDatabasePool } from "@vercel/functions";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  /** Whether attachDatabasePool has already been called for this process */
  poolAttached: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? {
  conn: null,
  promise: null,
  poolAttached: false,
};

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  // Reuse only a genuinely connected instance (readyState 1 = connected)
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Stale / broken connection — reset and reconnect
  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      // Give Atlas enough time to select a server on cold-start
      serverSelectionTimeoutMS: 15_000,
      // TCP connect timeout
      connectTimeoutMS: 15_000,
      // Don't set socketTimeoutMS — let the driver/Atlas manage it;
      // a fixed socket timeout kills long-running aggregations
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Always clear the promise so the next call retries a fresh connection
    cached.promise = null;
    cached.conn = null;
    throw err;
  }

  // One-time migration: drop the legacy single-column unique index on reviews.jobId
  // (replaced by compound index { jobId, clientId } in the Review schema)
  try {
    await cached.conn.connection.collection("reviews").dropIndex("jobId_1");
  } catch {
    // Index doesn't exist or already dropped — safe to ignore
  }

  // Tell Vercel Fluid Compute to keep this connection pool warm across
  // function invocations. Only called once per process; no-ops outside Vercel.
  if (!cached.poolAttached) {
    try {
      attachDatabasePool(cached.conn.connection.getClient());
      cached.poolAttached = true;
    } catch {
      // Non-fatal — attachDatabasePool may not be available in all environments
    }
  }

  return cached.conn;
}
