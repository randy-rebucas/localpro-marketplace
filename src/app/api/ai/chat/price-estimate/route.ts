import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { ValidationError } from "@/lib/errors";
import Job from "@/models/Job";

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:price-est:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const { jobData: { category, location, description, budgetMin, budgetMax } = {} as any } = body;

  if (!category || !location) {
    throw new ValidationError("Missing required fields for price estimate");
  }

  const recentJobs = await Job.find({
    category,
    status: "completed",
    createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  })
    .select("budget category duration location finalCost rating")
    .limit(100);

  let priceData = { minPrice: 0, maxPrice: 0, averagePrice: 0, sampleSize: recentJobs.length };

  if (recentJobs.length > 0) {
    const prices = recentJobs
      .map((j) => j.budget)
      .filter((p) => p > 0)
      .sort((a, b) => a - b);

    priceData.minPrice = prices[0];
    priceData.maxPrice = prices[prices.length - 1];
    priceData.averagePrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  }

  if (priceData.sampleSize === 0) {
    const categoryPriceMap: Record<string, { min: number; max: number }> = {
      plumbing: { min: 1500, max: 5000 },
      electrical: { min: 2000, max: 8000 },
      cleaning: { min: 1000, max: 3000 },
      carpentry: { min: 2500, max: 8000 },
      painting: { min: 3000, max: 10000 },
      hvac: { min: 2000, max: 6000 },
      appliance_repair: { min: 1500, max: 4000 },
      landscaping: { min: 2000, max: 7000 },
      general_handyman: { min: 1000, max: 4000 },
    };
    const est = categoryPriceMap[category.toLowerCase()] ?? { min: 1500, max: 5000 };
    priceData.minPrice = est.min;
    priceData.maxPrice = est.max;
    priceData.averagePrice = Math.round((est.min + est.max) / 2);
  }

  const finalEstimate = {
    estimatedPrice: {
      min: budgetMin || priceData.minPrice,
      max: budgetMax || priceData.maxPrice,
      average: priceData.averagePrice,
    },
    marketAverage: {
      min: priceData.minPrice,
      max: priceData.maxPrice,
      average: priceData.averagePrice,
    },
    sampleSize: priceData.sampleSize,
    category,
    currency: "PHP",
  };

  return NextResponse.json({
    message: `Based on ${finalEstimate.sampleSize || "market"} recent ${category} jobs in ${location}, I'd estimate ₱${finalEstimate.estimatedPrice.min.toLocaleString()} - ₱${finalEstimate.estimatedPrice.max.toLocaleString()}${finalEstimate.sampleSize > 0 ? " (average ₱" + finalEstimate.estimatedPrice.average.toLocaleString() + ")" : ""}.

Would you like to search for available providers at your budget?`,
    estimate: finalEstimate,
    nextAction: "SEARCH_PROVIDERS",
  });
});
