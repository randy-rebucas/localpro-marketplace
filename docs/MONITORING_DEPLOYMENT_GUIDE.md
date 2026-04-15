# Lead Monitoring Deployment & Activation Guide

**Date:** April 15, 2026  
**Status:** Ready for Deployment  
**Target:** Activate real-time lead qualification accuracy monitoring across VENDOR_REQUEST pipeline

---

## Executive Summary

This guide activates the lead monitoring infrastructure to track VENDOR_REQUEST qualification accuracy against actual outcomes. Upon deployment, every vendor inquiry will be monitored for:
- Lead score accuracy (target: >90% within 30 days)
- Team response time compliance (HIGH: 2-4hr, MEDIUM: 4-8hr, STANDARD: 24-48hr)
- Conversion funnel progression (inquiries → qualified → proposal → deal)
- Revenue impact by segment (MSME, Enterprise, Government, White-Label)

**Deployment Timeline:** 2-3 days  
**Go-Live Date:** April 18, 2026  
**Baseline Tracking Period:** April 18 - May 18, 2026 (30 days)

---

## Phase 1: Database Schema Setup (0.5 days)

### MongoDB Collections to Create

#### 1. `vendor_requests_monitoring`
Tracks every VENDOR_REQUEST from submission through conversion.

```javascript
db.createCollection("vendor_requests_monitoring", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["requestId", "submittedAt", "initialQualification"],
      properties: {
        _id: { bsonType: "objectId" },
        requestId: {
          bsonType: "string",
          description: "Unique identifier (TR-timestamp-hash)"
        },
        // Initial qualification snapshot
        initialQualification: {
          bsonType: "object",
          properties: {
            score: { bsonType: "int" },
            priority: { enum: ["high", "medium", "standard"] },
            industry: { bsonType: "string" },
            vendorType: { enum: ["sole_proprietor", "small_team", "agency", "enterprise"] },
            inquiryType: { enum: ["vendor_account", "partnership", "api_access", "white_label"] },
            timestamp: { bsonType: "date" }
          }
        },
        // Opportunity flags at time of submission
        opportunityFlags: {
          bsonType: "object",
          properties: {
            whiteLabelCandidate: { bsonType: "bool" },
            whiteLabelRevenue: { bsonType: "long" },
            pesoEligible: { bsonType: "bool" },
            managedServicesOpportunity: { bsonType: "bool" },
            managedServicesRevenue: { bsonType: "long" }
          }
        },
        // Team assignment
        routed: {
          bsonType: "object",
          properties: {
            team: { bsonType: "string" },
            timestamp: { bsonType: "date" },
            slaTarget: { bsonType: "int", description: "Minutes to respond" }
          }
        },
        // Progression through funnel
        funnel: {
          bsonType: "object",
          properties: {
            responded: { bsonType: "object" },
            qualified: { bsonType: "object" },
            proposalSent: { bsonType: "object" },
            converted: { bsonType: "object" }
          }
        },
        // Outcome metadata
        outcome: {
          bsonType: "object",
          properties: {
            status: { enum: ["pending", "responded", "qualified", "converted", "lost", "inactive"] },
            convertedAt: { bsonType: "date" },
            dealValue: { bsonType: "long" },
            conversionComments: { bsonType: "string" },
            accuracyFeedback: { bsonType: "string" }
          }
        },
        submittedAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
        // For dashboard & reporting
        cohortDate: { bsonType: "string", description: "YYYY-MM (for weekly/monthly grouping)" }
      }
    }
  }
});

// Indexes for query performance
db.vendor_requests_monitoring.createIndex({ requestId: 1 }, { unique: true });
db.vendor_requests_monitoring.createIndex({ cohortDate: 1, "initialQualification.priority": 1 });
db.vendor_requests_monitoring.createIndex({ "outcome.status": 1, submittedAt: -1 });
db.vendor_requests_monitoring.createIndex({ estimatedValue: 1 }, { sparse: true });
```

#### 2. `lead_qualification_accuracy`
Weekly/daily accuracy analysis results for trend detection.

```javascript
db.createCollection("lead_qualification_accuracy", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["period", "analyzedAt"],
      properties: {
        _id: { bsonType: "objectId" },
        period: {
          bsonType: "object",
          properties: {
            startDate: { bsonType: "date" },
            endDate: { bsonType: "date" },
            type: { enum: ["daily", "weekly", "monthly"] }
          }
        },
        // Accuracy metrics
        accuracy: {
          bsonType: "object",
          properties: {
            overall: { bsonType: "double", description: "0-100%" },
            byPriority: {
              bsonType: "object",
              properties: {
                high: { bsonType: "double" },
                medium: { bsonType: "double" },
                standard: { bsonType: "double" }
              }
            },
            byIndustry: { bsonType: "object" }
          }
        },
        // SLA compliance
        slaCompliance: {
          bsonType: "object",
          properties: {
            highPriority: { bsonType: "double" },
            mediumPriority: { bsonType: "double" },
            standardPriority: { bsonType: "double" }
          }
        },
        // Conversion rates by segment
        conversionRates: {
          bsonType: "object",
          properties: {
            overall: { bsonType: "double" },
            byPriority: { bsonType: "object" },
            byVendorType: { bsonType: "object" },
            byIndustry: { bsonType: "object" }
          }
        },
        // Revenue impact
        revenue: {
          bsonType: "object",
          properties: {
            pipelineValue: { bsonType: "long" },
            closedValue: { bsonType: "long" },
            avgDealSize: { bsonType: "double" },
            annualizedProjection: { bsonType: "long" }
          }
        },
        // Recommendations from analysis
        recommendations: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              category: { bsonType: "string" },
              finding: { bsonType: "string" },
              recommendation: { bsonType: "string" },
              potentialImpact: { bsonType: "string" }
            }
          }
        },
        analyzedAt: { bsonType: "date" }
      }
    }
  }
});

db.lead_qualification_accuracy.createIndex({ "period.type": 1, "period.endDate": -1 });
db.lead_qualification_accuracy.createIndex({ analyzedAt: -1 });
```

---

## Phase 2: API Endpoints for Monitoring (1 day)

### Endpoint 1: Record Lead Outcome
`POST /api/ai/chat/vendor-request/monitoring/outcome`

Used to update lead progression as it moves through funnel stages.

```typescript
// File: src/app/api/ai/chat/vendor-request/monitoring/outcome/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

interface UpdateLeadOutcomeRequest {
  requestId: string;
  stage: "responded" | "qualified" | "proposalSent" | "converted" | "lost";
  dealValue?: number;
  responseTime?: number; // minutes
  conversionComments?: string;
  accuracyFeedback?: string; // "accurate" | "inaccurate" | "needs_adjustment"
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = (await req.json()) as UpdateLeadOutcomeRequest;
    const { requestId, stage, dealValue, responseTime, conversionComments, accuracyFeedback } =
      body;

    if (!requestId || !stage) {
      return NextResponse.json(
        { error: "Missing requestId or stage" },
        { status: 400 }
      );
    }

    // Import the actual database collection (would use your ORM)
    const db = await connectDB();
    const collection = db.collection("vendor_requests_monitoring");

    // Update monitoring record with stage progression
    const updateData: any = {
      [`funnel.${stage}`]: {
        timestamp: new Date(),
        responseTime,
      },
      "outcome.status": stage === "converted" ? "converted" : stage === "lost" ? "lost" : stage,
      updatedAt: new Date(),
    };

    if (stage === "converted") {
      updateData["outcome.convertedAt"] = new Date();
      updateData["outcome.dealValue"] = dealValue;
    }

    if (conversionComments) {
      updateData["outcome.conversionComments"] = conversionComments;
    }

    if (accuracyFeedback) {
      updateData["outcome.accuracyFeedback"] = accuracyFeedback;
    }

    const result = await collection.updateOne(
      { requestId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Lead outcome recorded",
      requestId,
      stage,
      updated: result.modifiedCount > 0,
    });
  } catch (error) {
    console.error("[Monitoring] Outcome recording failed:", error);
    return NextResponse.json(
      { error: "Failed to record outcome" },
      { status: 500 }
    );
  }
}
```

### Endpoint 2: Get Accuracy Report
`GET /api/ai/chat/vendor-request/monitoring/accuracy?period=weekly`

Generates current accuracy metrics and recommendations.

```typescript
// File: src/app/api/ai/chat/vendor-request/monitoring/accuracy/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const period = req.nextUrl.searchParams.get("period") || "weekly";
    const daysBack = period === "daily" ? 1 : period === "weekly" ? 7 : 30;

    const db = await connectDB();
    const collection = db.collection("vendor_requests_monitoring");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Query leads in the period
    const leads = await collection
      .find({
        submittedAt: { $gte: startDate },
      })
      .toArray();

    // Calculate accuracy metrics
    const converted = leads.filter((l: any) => l.outcome?.status === "converted");
    const byPriority = {
      high: leads.filter((l: any) => l.initialQualification.priority === "high"),
      medium: leads.filter((l: any) => l.initialQualification.priority === "medium"),
      standard: leads.filter((l: any) => l.initialQualification.priority === "standard"),
    };

    const accuracy = {
      overall:
        leads.length > 0
          ? leads.filter((l: any) => l.outcome?.accuracyFeedback !== "inaccurate").length /
            leads.length
          : 0,
      byPriority: {
        high:
          byPriority.high.length > 0
            ? byPriority.high.filter((l: any) => l.outcome?.status !== "lost").length /
              byPriority.high.length
            : 0,
        medium:
          byPriority.medium.length > 0
            ? byPriority.medium.filter((l: any) => l.outcome?.status !== "lost").length /
              byPriority.medium.length
            : 0,
        standard:
          byPriority.standard.length > 0
            ? byPriority.standard.filter((l: any) => l.outcome?.status !== "lost").length /
              byPriority.standard.length
            : 0,
      },
    };

    const report = {
      period: { startDate, endDate: new Date(), type: period },
      totalLeads: leads.length,
      conversionRate: leads.length > 0 ? converted.length / leads.length : 0,
      accuracy,
      slaCompliance: calculateSLACompliance(leads),
      revenue: calculateRevenue(converted),
      generatedAt: new Date(),
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("[Monitoring] Accuracy report failed:", error);
    return NextResponse.json(
      { error: "Failed to generate accuracy report" },
      { status: 500 }
    );
  }
}

function calculateSLACompliance(leads: any[]): object {
  // Check response times against SLA targets
  const responded = leads.filter((l: any) => l.funnel?.responded);
  return {
    highPriority: responded.filter((l: any) => l.funnel?.responded?.responseTime <= 240).length,
    mediumPriority: responded.filter((l: any) => l.funnel?.responded?.responseTime <= 480).length,
    standardPriority: responded.filter((l: any) => l.funnel?.responded?.responseTime <= 1440).length,
  };
}

function calculateRevenue(converted: any[]): object {
  const totalValue = converted.reduce((sum, l) => sum + (l.outcome?.dealValue || 0), 0);
  return {
    closedValue: totalValue,
    avgDealSize: converted.length > 0 ? totalValue / converted.length : 0,
    annualizedProjection: (totalValue / (7 / 365)) * 52, // If weekly data
  };
}
```

---

## Phase 3: Monitoring Activation (1 day)

### Step 1: Initialize Baseline (April 18, 2026)

1. **Deploy database collections** (run MongoDB scripts in Phase 1)
2. **Deploy API endpoints** for outcome recording and reporting
3. **Update vendor-request handler** to persist lead snapshots (already done via `recordLeadOutcome()`)
4. **Configure notifications** to team leads about monitoring dashboard availability

### Step 2: Live Tracking (April 18 - May 18)

During the 30-day baseline period:
- Every vendor inquiry goes into `vendor_requests_monitoring` collection
- Team members use `/monitoring/outcome` endpoint to record stage progression
- Daily/weekly accuracy reports auto-generated and stored in `lead_qualification_accuracy`
- Automated alerts if conversion rate drops >1% or SLA compliance <85%

### Step 3: Analysis & Adjustments (May 18, 2026)

At end of 30-day period:
1. **Generate comprehensive accuracy report** using `analytics-dashboard.ts`
2. **Identify underperforming segments** (industry, vendor type, inquiry type)
3. **Make scoring weight adjustments** based on accuracy feedback
4. **Update `lead-monitoring.ts`** with recommendations
5. **Prepare optimization roadmap** for Phase 2 improvements

---

## Phase 4: KPI Targets & Success Metrics

### Accuracy Target: >90% within 30 days
- Correct priority assignment for HIGH priority leads: >90%
- Correct priority assignment for MEDIUM priority leads: >85%
- Correct priority assignment for STANDARD priority leads: >80%

### SLA Compliance Target: >92%
- HIGH priority: Response within 2-4 hours
- MEDIUM priority: Response within 4-8 hours
- STANDARD priority: Response within 24-48 hours

### Conversion Target: 7-9%
- Improve from current 7% by unlocking white-label and PESO segments
- Target: 8-9% overall conversion rate by end of baseline period

### Revenue Impact Target: ₱500M+ pipeline
- Current pipeline: ₱352M
- Target with enhancements: ₱500M+ by May 18
- Annualized: ₱1.4B+ projection

---

## Deployment Checklist

```
Phase 1: Database Setup
□ Create vendor_requests_monitoring collection
□ Create lead_qualification_accuracy collection
□ Create indexes for performance optimization
□ Test connection and queries

Phase 2: API Development
□ Create /monitoring/outcome endpoint
□ Create /monitoring/accuracy endpoint
□ Add authentication/authorization
□ Write integration tests (target: 100% coverage)

Phase 3: Integration
□ Link vendor-request handler to monitoring collection
□ Update recordLeadOutcome() to persist snapshots
□ Configure automated accuracy report generation
□ Set up alert thresholds

Phase 4: Deployment
□ Deploy to staging environment
□ Run full test suite
□ Deploy collection schema to production
□ Deploy API endpoints
□ Deploy monitoring dashboard

Phase 5: Activation
□ Brief sales/partnerships teams on monitoring
□ Provide outcome recording instructions
□ Schedule daily accuracy report reviews
□ Set calendar recurring analysis (weekly, monthly)

Phase 6: Baseline Tracking (30 days)
□ Monitor daily conversion rates
□ Track SLA compliance
□ Collect accuracy feedback from teams
□ Generate weekly accuracy reports
□ Identify improvement opportunities
```

---

## Quick Start for Teams

### Recording Lead Outcomes

Once live, teams record progression when:

1. **Lead Responded** → Call `/monitoring/outcome` with `stage: "responded"` + `responseTime`
2. **Lead Qualified** → Record `stage: "qualified"`
3. **Proposal Sent** → Record `stage: "proposalSent"`
4. **Deal Closed** → Record `stage: "converted"` + `dealValue`
5. **Lost Deal** → Record `stage: "lost"` + optional `conversionComments`

Example curl:
```bash
curl -X POST https://localpro.com/api/ai/chat/vendor-request/monitoring/outcome \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "TR-1776223326475-AYTWGOB",
    "stage": "converted",
    "dealValue": 2500000,
    "responseTime": 145,
    "accuracyFeedback": "accurate"
  }'
```

### Viewing Accuracy Metrics

**Daily Report:** `GET /monitoring/accuracy?period=daily`  
**Weekly Report:** `GET /monitoring/accuracy?period=weekly`  
**Monthly Report:** `GET /monitoring/accuracy?period=monthly`

Response includes:
- Current accuracy percentage by priority tier
- SLA compliance rates
- Conversion rates by segment
- Revenue projections
- Automated recommendations

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Teams forget to record outcomes | Incomplete data, inaccurate analysis | Automated reminders + SMS/Slack integration |
| High false-positive predictions | Wasted outreach effort | Weekly accuracy review + threshold adjustments |
| Database performance issues | Slow reports, delays in decision-making | Index optimization + data archival after 90 days |
| Scoring weights need frequent updates | Constant churn, team confusion | Lock weights for 30-day baseline, then adjust quarterly |

---

## Next Steps

1. **Immediate (Apr 15-16):** Deploy MongoDB collections and API endpoints to staging
2. **Staging Test (Apr 16-17):** Run 100 test inquiries through monitoring pipeline
3. **Production Deploy (Apr 18):** Go-live with baseline tracking
4. **Daily Reviews (Apr 18-May 18):** Weekly accuracy reports + team briefings
5. **Final Analysis (May 18):** Generate comprehensive accuracy report + optimization roadmap
