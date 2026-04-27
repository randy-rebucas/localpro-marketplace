import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { searchProvidersForJob, validateJobData } from "@/lib/chat-dispatcher";
import { checkRateLimit } from "@/lib/rateLimit";

/** POST /api/ai/chat/search-providers - Search for providers matching job criteria */
export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const rl = await checkRateLimit(`ai:search-providers:${user.userId}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { jobData } = await req.json();

  if (!jobData) {
    return NextResponse.json({ error: "Job data is required" }, { status: 400 });
  }

  // Validate job data
  const validated = validateJobData(jobData);
  if (!validated) {
    return NextResponse.json(
      { error: "Incomplete job information" },
      { status: 400 }
    );
  }

  try {
    const providers = await searchProvidersForJob(validated, 5);

    if (providers.length === 0) {
      return NextResponse.json({
        providers: [],
        message:
          "No providers available in your area right now. Please try again later or contact support.",
      });
    }

    return NextResponse.json({
      providers,
      count: providers.length,
      message: `Found ${providers.length} excellent matches for your job!`,
    });
  } catch (err) {
    console.error("[search-providers] error:", err);
    return NextResponse.json(
      { error: "Failed to search for providers" },
      { status: 500 }
    );
  }
});
