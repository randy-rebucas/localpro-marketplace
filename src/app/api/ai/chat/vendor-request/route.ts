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

    // Determine routing priority and team
    let routeToTeam = "vendor_onboarding"; // Default team
    let priority = "normal";

    if (inquiryType === "api_access") {
      routeToTeam = "technical_team";
      priority = vendorType === "enterprise" ? "high" : "normal";
    } else if (inquiryType === "white_label") {
      routeToTeam = "partnerships";
      priority = "high";
    } else if (vendorType === "enterprise") {
      routeToTeam = "sales_team";
      priority = "high";
    }

    // Generate unique request ID
    const requestId = `TR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Create vendor request record (would be saved to DB in production)
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
    };

    try {
      // Send notification to appropriate team
      await enqueueNotification({
        userId: routeToTeam,
        channel: "email",
        category: "VENDOR_INQUIRY",
        subject: `New Vendor Inquiry - ${vendorType}`,
        body: `New ${inquiryType} inquiry from ${businessName || "Unknown"}. Message: ${message}`,
        immediate: true,
      });
    } catch (notificationErr) {
      console.error("[Vendor Request] Notification failed:", notificationErr);
      // Don't fail the whole request if notification fails
    }

    // Determine estimated response time
    const estimatedResponse =
      priority === "high"
        ? "within 2-4 hours"
        : "within 24-48 hours";

    // Generate helpful response based on inquiry type
    let followUpInfo = "";
    if (inquiryType === "vendor_account") {
      followUpInfo =
        "\n\n**What happens next:**\n• Our vendor team will review your profile\n• You'll get access to our provider dashboard\n• Set your rates, availability, and service areas\n• Start receiving job listings immediately!";
    } else if (inquiryType === "api_access") {
      followUpInfo =
        "\n\n**What happens next:**\n• Technical team will send you API documentation\n• Integration sandbox environment provided\n• Dedicated integration support\n• Full API access for your platform";
    } else if (inquiryType === "partnership") {
      followUpInfo =
        "\n\n**What happens next:**\n• Partnership team will contact you with opportunities\n• Discuss volume rates, revenue sharing, or co-marketing\n• Custom terms based on your needs\n• Dedicated account manager assigned";
    } else if (inquiryType === "white_label") {
      followUpInfo =
        "\n\n**What happens next:**\n• White-label specialist will reach out\n• Discuss branding, pricing, and integration\n• Demo environment access\n• Custom implementation timeline";
    }

    return NextResponse.json({
      message: `Thank you for your interest, ${businessName || "partner"}! We're excited to learn more about your business.

**Request ID:** ${requestId}
**Estimated Response:** ${estimatedResponse}
**Status:** Pending Review

Our ${routeToTeam.replace(/_/g, " ")} team will be in touch shortly to discuss partnership opportunities.${followUpInfo}`,
      requestId,
      status: "received",
      estimatedResponse,
      nextAction: "VENDOR_REQUEST_SUBMITTED",
    });
  } catch (error) {
    console.error("[Vendor Request] Error:", error);
    return NextResponse.json(
      { error: "Failed to process vendor request" },
      { status: 500 }
    );
  }
}
