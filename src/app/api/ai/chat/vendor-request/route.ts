import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { enqueueNotification } from "@/lib/notification-queue";

// Type for vendor request
interface VendorRequestData {
  businessName?: string;
  vendorType: "sole_proprietor" | "small_team" | "agency" | "enterprise";
  inquiryType: "vendor_account" | "partnership" | "api_access" | "white_label";
  message: string;
}

// Lead qualification scoring
interface LeadScore {
  priority: "high" | "medium" | "standard";
  qualificationScore: number; // 0-100
  recommendedPlan?: "Starter" | "Growth" | "Pro" | "Enterprise";
  upsellOpportunities: string[];
  industryCategory?: string;
}

// Industry detection keywords mapping
const INDUSTRY_KEYWORDS = {
  "Transportation & Logistics": [
    "logistics",
    "courier",
    "delivery",
    "transport",
    "warehouse",
    "fleet",
    "dispatcher",
    "deliveries",
  ],
  "Beauty & Personal Care": [
    "salon",
    "spa",
    "barbershop",
    "beauty",
    "clinic",
    "aesthetics",
  ],
  "Food & Culinary": [
    "restaurant",
    "catering",
    "food",
    "f&b",
    "delivery",
    "cafe",
    "bakery",
  ],
  "Tailoring & Alterations": ["tailor", "alteration", "dressmaking", "sewing"],
  "Pet Care": [
    "pet",
    "grooming",
    "veterinary",
    "vet",
    "pet training",
    "pet care",
  ],
  Hospitality: [
    "hotel",
    "resort",
    "mall",
    "venue",
    "event",
    "catering",
    "hospitality",
  ],
  "Construction & Infrastructure": [
    "construction",
    "contractor",
    "building",
    "engineering",
    "infrastructure",
    "project",
  ],
  "Mechanical & Industrial": [
    "repair",
    "mechanical",
    "industrial",
    "manufacturing",
    "equipment",
  ],
  "IT & Technology": [
    "software",
    "it",
    "tech",
    "technology",
    "developer",
    "it services",
    "saas",
  ],
  "Security & Safety": [
    "security",
    "safety",
    "guard",
    "emergency",
    "compliance",
  ],
};

/**
 * Detect industry category from business name and message
 * Prioritizes more specific/specific industries with stricter keyword matching
 */
function detectIndustry(businessName?: string, message?: string): string | undefined {
  const searchText = `${businessName || ""} ${message || ""}`.toLowerCase();
  let detectedIndustry: string | undefined;
  let maxMatchCount = 0;

  // Check industries in order of specificity (more specific first)
  // This prevents generic keywords like "platform" from overriding explicit industry terms
  const industryCheckOrder = [
    "Construction & Infrastructure",
    "Transportation & Logistics",
    "Beauty & Personal Care",
    "Food & Culinary",
    "Hospitality",
    "Tailoring & Alterations",
    "Pet Care",
    "Mechanical & Industrial",
    "Security & Safety",
    "IT & Technology",
  ];

  for (const industry of industryCheckOrder) {
    const keywords = INDUSTRY_KEYWORDS[industry as keyof typeof INDUSTRY_KEYWORDS];
    if (!keywords) continue;

    const matchCount = keywords.filter((kw) =>
      searchText.includes(kw.toLowerCase())
    ).length;

    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount;
      detectedIndustry = industry;
    }
  }

  return detectedIndustry;
}

/**
 * Calculate lead qualification score based on vendor type and inquiry type
 * Returns priority, score, recommended plan, and upsell opportunities
 */
function scoreLeadQualification(
  vendorType: VendorRequestData["vendorType"],
  inquiryType: VendorRequestData["inquiryType"],
  industry?: string,
  message?: string
): LeadScore {
  let qualificationScore = 50; // Base score
  const upsellOpportunities: string[] = [];
  let recommendedPlan: LeadScore["recommendedPlan"];
  let priority: LeadScore["priority"] = "standard";

  // Scorecard based on inquiry type (primary driver)
  if (inquiryType === "white_label") {
    priority = vendorType === "enterprise" ? "high" : "medium";
    qualificationScore = vendorType === "enterprise" ? 85 : 70;
  } else if (inquiryType === "partnership") {
    // Partnership inquiries are HIGH priority tier
    if (vendorType === "enterprise") {
      priority = "high";
      qualificationScore = 85;
    } else if (vendorType === "agency" || vendorType === "small_team") {
      priority = "medium";
      qualificationScore = 65;
    } else {
      priority = "standard";
      qualificationScore = 55;
    }
  } else if (inquiryType === "api_access") {
    // API access indicates technical sophistication
    if (vendorType === "enterprise") {
      priority = "high";
      qualificationScore = 80;
    } else {
      priority = "standard";
      qualificationScore = 55;
      // But check for high-volume signals
      if (
        message &&
        (message.includes("thousands") ||
          message.includes("manage thousands") ||
          message.includes("high volume"))
      ) {
        priority = "medium";
        qualificationScore = 65;
      }
    }
  } else {
    // vendor_account (default)
    if (vendorType === "enterprise") {
      priority = "high";
      qualificationScore = 75;
    } else if (vendorType === "agency") {
      priority = "standard";
      qualificationScore = 60;
    } else if (vendorType === "small_team") {
      priority = "standard";
      qualificationScore = 50;
    } else {
      // sole_proprietor
      priority = "standard";
      qualificationScore = 40;
    }
  }

  // Determine recommended plan
  if (vendorType === "enterprise") {
    recommendedPlan = "Enterprise";
    upsellOpportunities.push("Custom integrations with your existing systems");
    upsellOpportunities.push(
      "Dedicated account manager and priority support"
    );
  } else if (vendorType === "agency") {
    recommendedPlan = "Pro";
    upsellOpportunities.push("Multi-location management across all branches");
    upsellOpportunities.push("Team collaboration and role-based access control");
  } else if (vendorType === "small_team") {
    recommendedPlan = "Growth";
    upsellOpportunities.push("Unlock 25 team members and 100 jobs/month");
    upsellOpportunities.push("Advanced analytics and compliance reporting");
  } else {
    recommendedPlan = "Starter";
  }

  // Check for government/institution inquiry (override to HIGH priority)
  if (message && /government|lgu|dole|tesda|institution|peso/i.test(message)) {
    qualificationScore = Math.min(qualificationScore + 15, 100);
    if (priority !== "high") {
      priority = "high";
    }
    upsellOpportunities.push(
      "PESO partnership integration and workforce registry"
    );
    upsellOpportunities.push(
      "Compliance reporting and government audit trails"
    );
  }

  // Cap score at 100
  qualificationScore = Math.min(qualificationScore, 100);

  return {
    priority,
    qualificationScore,
    recommendedPlan,
    upsellOpportunities,
    industryCategory: industry,
  };
}

/**
 * Generate industry-specific messaging based on detected industry
 */
function getIndustrySpecificMessage(industry?: string): string {
  switch (industry) {
    case "Beauty & Personal Care":
      return "Your team will connect with our Beauty & Personal Care specialists who can show you how to reduce hiring friction and access verified, 4.5+ rated professionals on-demand.";
    case "Food & Culinary":
      return "Our Hospitality & F&B team will help you explore recurring subscription models and unified staff management across your locations.";
    case "Hospitality":
      return "Our Enterprise team specializes in multi-location compliance, CRM integration, and volume-based pricing for hospitality groups.";
    case "Construction & Infrastructure":
      return "Our Construction & Logistics specialists will discuss our URGENT_SERVICE endpoint, skilled provider matching, and compliance frameworks for complex projects.";
    case "Transportation & Logistics":
      return "Our Logistics team can show you real-time provider availability, multi-location dispatch management, and fraud prevention features.";
    case "IT & Technology":
      return "Our technical team will work with you on API access, custom integrations, and white-label opportunities for your platform.";
    default:
      return "Our partnerships team will reach out to explore the best LocalPro offering for your business.";
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { vendorData, userEmail } = body;

    if (!vendorData) {
      return NextResponse.json(
        { error: "Missing vendor data" },
        { status: 400 }
      );
    }

    // Extract inquiry details
    const { businessName, vendorType, inquiryType, message } = vendorData;

    // Detect industry from business name and message
    const detectedIndustry = detectIndustry(businessName, message);

    // Score the lead
    const leadScore = scoreLeadQualification(
      vendorType,
      inquiryType,
      detectedIndustry,
      message
    );

    // Determine routing priority and team based on lead score
    let routeToTeam = "vendor_onboarding"; // Default team
    let priority = leadScore.priority;

    if (inquiryType === "api_access") {
      routeToTeam = "technical_team";
      priority = leadScore.priority;
    } else if (inquiryType === "white_label") {
      routeToTeam = "partnerships";
      priority = "high";
    } else if (inquiryType === "partnership") {
      routeToTeam = "sales_team";
      priority = leadScore.priority;
    } else if (vendorType === "enterprise") {
      routeToTeam = "sales_team";
      priority = "high";
    }

    // Generate unique request ID
    const requestId = `TR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Create vendor request record with lead qualification data
    const vendorRequest = {
      requestId,
      businessName: businessName || "Not specified",
      vendorType,
      inquiryType,
      message,
      userEmail,
      createdAt: new Date(),
      status: "pending_response",
      routeToTeam,
      priority,
      leadQualification: {
        score: leadScore.qualificationScore,
        industry: detectedIndustry,
        recommendedPlan: leadScore.recommendedPlan,
        upsellOpportunities: leadScore.upsellOpportunities,
      },
    };

    try {
      // Send notification to appropriate team with enriched context
      await enqueueNotification({
        userId: routeToTeam,
        channel: "email",
        category: "VENDOR_INQUIRY",
        subject: `[${priority.toUpperCase()}] New Vendor Inquiry - ${vendorType} | Score: ${leadScore.qualificationScore}/100`,
        body: `New ${inquiryType} inquiry from ${businessName || "Unknown"} (${detectedIndustry || "industry TBD"})
        
Lead Score: ${leadScore.qualificationScore}/100 (${priority} priority)
Recommended Plan: ${leadScore.recommendedPlan || "N/A"}
Message: ${message}

Upsell Opportunities:
${leadScore.upsellOpportunities.map((opp) => `• ${opp}`).join("\n")}`,
        immediate: priority === "high",
      });
    } catch (notificationErr) {
      console.error("[Vendor Request] Notification failed:", notificationErr);
      // Don't fail the whole request if notification fails
    }

    // Determine estimated response time based on priority
    const estimatedResponse =
      priority === "high"
        ? "within 2-4 hours"
        : priority === "medium"
          ? "within 4-8 hours"
          : "within 24-48 hours";

    // Generate helpful response based on inquiry type and lead score
    let followUpInfo = "";
    let industryMessage = getIndustrySpecificMessage(detectedIndustry);

    if (inquiryType === "vendor_account") {
      followUpInfo = `\n\n**What happens next:**
• Our vendor onboarding team will review your profile
• You'll get access to our provider dashboard  
• Set your rates, availability, and service areas
• Start receiving job listings immediately!

**Next Step:** Check your email for dashboard access link and onboarding guide
**Recommended Plan:** ${leadScore.recommendedPlan || "Starter"}`;
    } else if (inquiryType === "api_access") {
      followUpInfo = `\n\n**What happens next:**
• Technical team will send you API documentation
• Integration sandbox environment provided
• Dedicated integration support
• Full API access for your platform

**Industry:** ${detectedIndustry || "TBD"}
**Next Step:** Expect technical specification sheet within 2-4 hours
${leadScore.upsellOpportunities.length > 0 ? `\n**Potential Opportunities:**\n${leadScore.upsellOpportunities.map((opp) => `• ${opp}`).join("\n")}` : ""}`;
    } else if (inquiryType === "partnership") {
      followUpInfo = `\n\n**What happens next:**
${industryMessage}

**Lead Score:** ${leadScore.qualificationScore}/100
**Recommended Plan:** ${leadScore.recommendedPlan || "N/A"}

**Key Opportunities:**
${leadScore.upsellOpportunities.map((opp) => `• ${opp}`).join("\n")}

**Timeline:** Our team will schedule a discovery call to discuss your specific needs and revenue potential`;
    } else if (inquiryType === "white_label") {
      followUpInfo = `\n\n**What happens next:**
• White-label specialist will reach out to discuss branding, pricing, and integration
• Demo environment access provided
• Custom implementation timeline and revenue share models discussed
• MOU preparation for your signature

${
  vendorRequest.leadQualification.score >= 70
    ? "\n**Priority:** This inquiry qualifies for our premium white-label partnership track with dedicated account management"
    : ""
}

**Expected Commission Model:** 60/40 split (LocalPro/Partner) escalating to 50/50 at higher volumes
**Next Step:** Expect white-label partnership proposal within 4-6 hours`;
    }

    return NextResponse.json({
      message: `Thank you for your interest, ${businessName || "partner"}! We're excited to learn more about your business.

**Request ID:** ${requestId}
**Lead Qualification Score:** ${leadScore.qualificationScore}/100 (${leadScore.priority} priority)
**Estimated Response:** ${estimatedResponse}
**Status:** Pending Review

Our ${routeToTeam.replace(/_/g, " ")} team will be in touch shortly with tailored opportunities for your business.${followUpInfo}`,
      requestId,
      status: "received",
      estimatedResponse,
      nextAction: "VENDOR_REQUEST_SUBMITTED",
      leadScore: {
        score: leadScore.qualificationScore,
        priority: leadScore.priority,
        industry: detectedIndustry,
        recommendedPlan: leadScore.recommendedPlan,
        upsellOpportunities: leadScore.upsellOpportunities,
      },
    });
  } catch (error) {
    console.error("[Vendor Request] Error:", error);
    return NextResponse.json(
      { error: "Failed to process vendor request" },
      { status: 500 }
    );
  }
}
