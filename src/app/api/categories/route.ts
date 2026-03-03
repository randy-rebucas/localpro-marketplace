import { withHandler } from "@/lib/utils";
import { categoryRepository } from "@/repositories";
import { unstable_cache } from "next/cache";

// Categories change rarely — cache the response for 24 hours
export const revalidate = 86400;

const getCachedCategories = unstable_cache(
  async () => {
    await categoryRepository.seedIfEmpty();
    return categoryRepository.findActive();
  },
  ["categories"],
  { revalidate: 86400, tags: ["categories"] }
);

export const GET = withHandler(async () => {
  const categories = await getCachedCategories();
  return Response.json(categories);
});
