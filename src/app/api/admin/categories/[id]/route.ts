import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { categoryRepository } from "@/repositories";
import { NotFoundError, assertObjectId } from "@/lib/errors";

import { checkRateLimit } from "@/lib/rateLimit";
type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/categories/[id]
export const PATCH = withHandler(async (req: NextRequest, ctx: Ctx) => {
  const user = await requireUser();
  requireCapability(user, "manage_categories");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  assertObjectId(id, "categoryId");
  const body = await req.json();

  // Allowlist accepted fields to prevent mass assignment
  type UpdatePayload = { name?: string; slug?: string; isActive?: boolean; order?: number; description?: string };
  const updates: UpdatePayload = {};
  if (typeof body.name        === "string")  updates.name     = body.name.trim();
  if (typeof body.isActive    === "boolean") updates.isActive = body.isActive;
  if (typeof body.order       === "number")  updates.order    = body.order;
  if (typeof body.description === "string")  updates.description = body.description.trim();

  // Rebuild slug if name changes
  if (updates.name) {
    updates.slug = updates.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  const category = await categoryRepository.updateById(id, updates);
  if (!category) throw new NotFoundError("Category");

  return NextResponse.json(category);
});

// DELETE /api/admin/categories/[id]
export const DELETE = withHandler(async (_req: NextRequest, ctx: Ctx) => {
  const user = await requireUser();
  requireCapability(user, "manage_categories");
  const rl = await checkRateLimit(`admin:${user.userId}`, { windowMs: 60_000, max: 200 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  assertObjectId(id, "categoryId");
  const category = await categoryRepository.deleteById(id);
  if (!category) throw new NotFoundError("Category");

  return NextResponse.json({ success: true });
});
