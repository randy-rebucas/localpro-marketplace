import { describe, it, expect, vi } from "vitest";

// ── Stub environment variables BEFORE any module resolution ─────────────────
// vi.hoisted runs before vi.mock hoisting, so env vars are set before the
// auth module's top-level guard executes.
vi.hoisted(() => {
  process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long!!";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-at-least-32-characters!!";
});

// ── Mock external dependencies so tests run without DB / Redis / Next.js ────
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: vi.fn() }),
}));

vi.mock("@/lib/redis", () => ({
  getRedis: vi.fn().mockReturnValue(null),
}));

// Now import the module under test
import {
  signAccessToken,
  verifyAccessToken,
  requireRole,
  requireCapability,
  type TokenPayload,
} from "@/lib/auth";
import { ForbiddenError } from "@/lib/errors";

// ─── signAccessToken ────────────────────────────────────────────────────────
describe("signAccessToken", () => {
  it("returns a JWT string with three dot-separated parts", () => {
    const token = signAccessToken("user123", "client");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("produces a token that verifyAccessToken can decode", () => {
    const token = signAccessToken("user456", "provider", ["manage_jobs"]);
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe("user456");
    expect(payload.role).toBe("provider");
    expect(payload.capabilities).toEqual(["manage_jobs"]);
  });
});

// ─── verifyAccessToken ──────────────────────────────────────────────────────
describe("verifyAccessToken", () => {
  it("rejects an expired token", async () => {
    // jsonwebtoken allows specifying expiresIn via sign options.
    // We import jwt directly to craft a token that already expired.
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET!;
    const expired = jwt.default.sign({ userId: "u1", role: "client" }, secret, {
      expiresIn: "-1s",
    });

    expect(() => verifyAccessToken(expired)).toThrow();
  });

  it("rejects a token signed with the wrong secret", () => {
    const jwt = require("jsonwebtoken");
    const bad = jwt.sign({ userId: "u1", role: "client" }, "wrong-secret-that-is-32-chars-long!!");
    expect(() => verifyAccessToken(bad)).toThrow();
  });
});

// ─── requireRole ────────────────────────────────────────────────────────────
describe("requireRole", () => {
  const adminUser: TokenPayload = { userId: "a1", role: "admin" };
  const clientUser: TokenPayload = { userId: "c1", role: "client" };

  it("does not throw when the user has an allowed role", () => {
    expect(() => requireRole(adminUser, "admin", "staff")).not.toThrow();
  });

  it("throws ForbiddenError when the user role is not in the allowed list", () => {
    expect(() => requireRole(clientUser, "admin", "staff")).toThrow(ForbiddenError);
  });
});

// ─── requireCapability ──────────────────────────────────────────────────────
describe("requireCapability", () => {
  it("allows admin to bypass capability checks", () => {
    const admin: TokenPayload = { userId: "a1", role: "admin" };
    expect(() => requireCapability(admin, "manage_jobs")).not.toThrow();
  });

  it("allows staff with the required capability", () => {
    const staff: TokenPayload = {
      userId: "s1",
      role: "staff",
      capabilities: ["manage_jobs", "manage_kyc"],
    };
    expect(() => requireCapability(staff, "manage_jobs")).not.toThrow();
  });

  it("throws ForbiddenError for staff without the capability", () => {
    const staff: TokenPayload = {
      userId: "s2",
      role: "staff",
      capabilities: ["manage_kyc"],
    };
    expect(() => requireCapability(staff, "manage_jobs")).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError for staff with no capabilities at all", () => {
    const staff: TokenPayload = { userId: "s3", role: "staff" };
    expect(() => requireCapability(staff, "manage_jobs")).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError for non-admin, non-staff roles", () => {
    const client: TokenPayload = { userId: "c1", role: "client" };
    expect(() => requireCapability(client, "manage_jobs")).toThrow(ForbiddenError);
  });
});
