import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Job from "@/models/Job";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { jobData: { category, location, description, budgetMin, budgetMax } } =
      body;

    // Validate required fields
    if (!category || !location) {
      return NextResponse.json(
        { error: "Missing required fields for price estimate" },
        { status: 400 }
      );
    }

    // Query historical jobs in this category for pricing data
    const recentJobs = await Job.find({
      category,
      status: "completed",
      createdAt: {
        $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      },
    })
      .select("budget category duration location finalCost rating")
      .limit(100);

    // Calculate average pricing
    let priceData = {
      minPrice: 0,
      maxPrice: 0,
      averagePrice: 0,
      sampleSize: recentJobs.length,
    };

    if (recentJobs.length > 0) {
      const prices = recentJobs
        .map((j) => j.budget)
        .filter((p) => p > 0)
        .sort((a, b) => a - b);

      priceData.minPrice = prices[0];
      priceData.maxPrice = prices[prices.length - 1];
      priceData.averagePrice = Math.round(
        prices.reduce((a, b) => a + b, 0) / prices.length
      );
    }

    // If no historical data, provide category-based estimate
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

      const categoryEstimate = categoryPriceMap[category.toLowerCase()] || {
        min: 1500,
        max: 5000,
      };
      priceData.minPrice = categoryEstimate.min;
      priceData.maxPrice = categoryEstimate.max;
      priceData.averagePrice = Math.round(
        (categoryEstimate.min + categoryEstimate.max) / 2
      );
    }

    // Apply user's budget constraints if provided
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
  } catch (error) {
    console.error("[AI Chat] Price estimate failed:", error);
    return NextResponse.json(
      { error: "Failed to calculate price estimate" },
      { status: 500 }
    );
  }
}
