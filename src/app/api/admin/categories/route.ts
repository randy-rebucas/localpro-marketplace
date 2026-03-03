import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withHandler } from "@/lib/utils";
import { requireUser, requireCapability } from "@/lib/auth";
import { categoryRepository } from "@/repositories";
import { ValidationError, ConflictError } from "@/lib/errors";

const CreateCategorySchema = z.object({
  name:        z.string().min(1, "Name is required").max(60),
  icon:        z.string().optional(),
  description: z.string().max(300).optional(),
  order:       z.number().int().optional(),
});

// GET /api/admin/categories — all categories (active + inactive)
export const GET = withHandler(async () => {
  const user = await requireUser();
  requireCapability(user, "manage_categories");

  const categories = await categoryRepository.findAll();
  return NextResponse.json(categories);
});

// POST /api/admin/categories — create a new category
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  requireCapability(user, "manage_categories");

  const body = await req.json();
  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);

  const { name, icon, description, order } = parsed.data;
  const trimmedName = name.trim();
  const slug = trimmedName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const existing = await categoryRepository.findByNameOrSlug(trimmedName, slug);
  if (existing) throw new ConflictError("Category already exists");

  const maxOrder = await categoryRepository.findMaxOrder();
  const nextOrder = typeof order === "number" ? order : maxOrder + 1;

  const category = await categoryRepository.create({
    name: trimmedName,
    slug,
    icon: icon?.trim() || "🔧",
    description: description?.trim() || "",
    order: nextOrder,
  });

  return NextResponse.json(category, { status: 201 });
});
