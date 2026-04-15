/**
 * Analytics Dashboard Specification
 * 
 * Real-time dashboard for VENDOR_REQUEST → Partnership conversion funnel
 * Tracks lead quality, team performance, and revenue pipeline
 */

export interface DashboardMetrics {
  period: "daily" | "weekly" | "monthly" | "quarterly";
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: FunnelMetrics & PerformanceMetrics & RevenueMetrics;
  benchmarks: BenchmarkComparison;
  recommendations: Recommendation[];
}

export interface FunnelMetrics {
  // VENDOR_REQUEST Funnel
  totalInquiries: number;
  inquiriesByType: {
    vendor_account: number;
    partnership: number;
    api_access: number;
    white_label: number;
  };
  inquiriesByPriority: {
    high: number;
    medium: number;
    standard: number;
  };
  inquiriesByVendorType: {
    sole_proprietor: number;
    small_team: number;
    agency: number;
    enterprise: number;
  };
  inquiriesByIndustry: {
    [industry: string]: number;
  };

  // Conversion stages
  responded: number;
  responsionRate: number; // %
  qualified: number;
  qualificationRate: number; // % of responded
  proposalSent: number;
  proposalRate: number; // % of qualified
  converted: number; // deal closed
  conversionRate: number; // % of proposal sent
  overallFunnelConversion: number; // % of total inquiries
}

export interface PerformanceMetrics {
  // Team performance
  avgResponseTime: number; // minutes
  slaComplianceRate: number; // % meeting target response time
  leadQualificationAccuracy: number; // % of leads scored correctly
  upsellDetectionRate: number; // % of upsell opportunities identified
  averageLeadScore: number; // 0-100

  // By team
  teamPerformance: {
    [teamName: string]: {
      responsTime: number;
      conversionRate: number;
      avgDealValue: number;
      piplineValue: number;
    };
  };

  // By industry
  industryConversion: {
    [industry: string]: {
      conversionRate: number;
      avgDealValue: number;
      volumePotential: number;
    };
  };
}

export interface RevenueMetrics {
  // Revenue tracking
  pipelineValue: number; // PHP - all open deals
  closedValue: number; // PHP - deals closed this period
  forecastedValue: number; // PHP - projected for next 90 days
  topDealValue: number; // largest deal in pipeline
  averageDealValue: number;

  // By segment
  revenueBySegment: {
    msme: number;
    enterprise: number;
    government: number;
    whiteLabel: number;
  };

  // Commission impact
  estimatedCommissionRevenue: number; // from converted partnerships
  annualizedPipeline: number; // projected annual value
}

export interface BenchmarkComparison {
  // Compare to targets and historical data
  vs_target: {
    metric: string;
    target: number;
    actual: number;
    variance: number; // %
    status: "on-track" | "at-risk" | "exceeding";
  }[];

  vs_previous_period: {
    metric: string;
    previous: number;
    current: number;
    change: number; // %
    trend: "up" | "down" | "flat";
  }[];
}

export interface Recommendation {
  category: "conversion" | "efficiency" | "revenue" | "team";
  priority: "high" | "medium" | "low";
  finding: string;
  recommendation: string;
  potentialImpact: string; // "increase conversion by X%"
  actionItems: string[];
}

/**
 * Generate dashboard metrics report
 */
export function generateDashboardMetrics(
  periodType: "daily" | "weekly" | "monthly" = "weekly"
): DashboardMetrics {
  const now = new Date();
  const start =
    periodType === "daily"
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
      : periodType === "weekly"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    period: periodType,
    dateRange: { start, end: now },
    metrics: {
      // Funnel metrics (sample data)
      totalInquiries: 245,
      inquiriesByType: {
        vendor_account: 120,
        partnership: 85,
        api_access: 25,
        white_label: 15,
      },
      inquiriesByPriority: {
        high: 48,
        medium: 97,
        standard: 100,
      },
      inquiriesByVendorType: {
        sole_proprietor: 100,
        small_team: 85,
        agency: 40,
        enterprise: 20,
      },
      inquiriesByIndustry: {
        "Beauty & Personal Care": 30,
        "Food & Culinary": 35,
        Hospitality: 25,
        "Construction & Infrastructure": 40,
        "Transportation & Logistics": 45,
        "IT & Technology": 15,
        "Security & Safety": 10,
        Others: 45,
      },
      responded: 186,
      responsionRate: 76,
      qualified: 112,
      qualificationRate: 60,
      proposalSent: 68,
      proposalRate: 61,
      converted: 17,
      conversionRate: 25,
      overallFunnelConversion: 7,

      // Performance metrics
      avgResponseTime: 187,
      slaComplianceRate: 92,
      leadQualificationAccuracy: 88,
      upsellDetectionRate: 76,
      averageLeadScore: 62,

      teamPerformance: {
        sales_team: {
          responsTime: 145,
          conversionRate: 32,
          avgDealValue: 2_500_000,
          piplineValue: 85_000_000,
        },
        partnerships: {
          responseTime: 210,
          conversionRate: 28,
          avgDealValue: 8_500_000,
          pipelineValue: 255_000_000,
        },
        technical_team: {
          responseTime: 120,
          conversionRate: 18,
          avgDealValue: 550_000,
          pipelineValue: 12_000_000,
        },
      },

      industryConversion: {
        Hospitality: {
          conversionRate: 32,
          avgDealValue: 5_200_000,
          volumePotential: 125_000_000,
        },
        "Transportation & Logistics": {
          conversionRate: 28,
          avgDealValue: 4_100_000,
          volumePotential: 98_000_000,
        },
        "Beauty & Personal Care": {
          conversionRate: 15,
          avgDealValue: 850_000,
          volumePotential: 32_000_000,
        },
      },

      // Revenue metrics
      pipelineValue: 352_000_000,
      closedValue: 42_500_000,
      forecastedValue: 185_000_000,
      topDealValue: 15_000_000,
      averageDealValue: 2_500_000,

      revenueBySegment: {
        msme: 85_000_000,
        enterprise: 185_000_000,
        government: 35_000_000,
        whiteLabel: 47_000_000,
      },

      estimatedCommissionRevenue: 26_500_000,
      annualizedPipeline: 1_408_000_000,
    },

    benchmarks: {
      vs_target: [
        {
          metric: "VENDOR_REQUEST Coverage",
          target: 15,
          actual: 7,
          variance: -53,
          status: "at-risk",
        },
        {
          metric: "Lead Qualification Accuracy",
          target: 90,
          actual: 88,
          variance: -2,
          status: "on-track",
        },
        {
          metric: "Response Time (HIGH priority, min)",
          target: 120,
          actual: 187,
          variance: 56,
          status: "at-risk",
        },
        {
          metric: "Overall Conversion Rate (%)",
          target: 8,
          actual: 7,
          variance: -12,
          status: "on-track",
        },
      ],

      vs_previous_period: [
        {
          metric: "Total Inquiries",
          previous: 198,
          current: 245,
          change: 24,
          trend: "up",
        },
        {
          metric: "Response Rate (%)",
          previous: 73,
          current: 76,
          change: 4,
          trend: "up",
        },
        {
          metric: "Conversion Rate (%)",
          previous: 6.5,
          current: 7,
          change: 8,
          trend: "up",
        },
      ],
    },

    recommendations: [
      {
        category: "efficiency",
        priority: "high",
        finding:
          "Response time for HIGH priority inquiries is 187min vs. 120min target (56% over SLA)",
        recommendation:
          "Increase partnerships team capacity or implement queue management system",
        potentialImpact:
          "Improving response time to target would increase HIGH priority conversion by 8-12%",
        actionItems: [
          "Hire 1 additional partnerships team member",
          "Implement triage system (auto-route by inquiry type)",
          "Set escalation alerts at 60min for WHITE_LABEL inquiries",
        ],
      },
      {
        category: "conversion",
        priority: "high",
        finding:
          "VENDOR_REQUEST coverage at 7% vs. 15% target; underperforming by 53%",
        recommendation:
          "Review lead scoring accuracy; likely underscoring MSME and solo proprietor segments",
        potentialImpact:
          "Improving scoring would unlock ₱180M+ in additional potential partnerships (8-10% more coverage)",
        actionItems: [
          "Review low-scoring leads that later converted (accuracy audit)",
          "Adjust scoring weights for 'scale' and 'expand' language signals",
          "Increase outreach to MSME segment (currently 68% of inquiries but only 12% converted)",
        ],
      },
      {
        category: "revenue",
        priority: "medium",
        finding:
          "White-label pipeline growing (₱47M, +15% vs. previous period) but average deal size below potential",
        recommendation:
          "Create white-label segment specialist role; franchise partnerships need different playbook",
        potentialImpact:
          "Strategic white-label focus could increase segment to ₱150M+ annual pipeline",
        actionItems: [
          "Hire 1 white-label partnership specialist",
          "Create franchise outreach playbook",
          "Target 5-10 new franchise partners by Q3",
        ],
      },
      {
        category: "team",
        priority: "medium",
        finding:
          "Partnerships team response time (210min) slowing conversions; lower conv% vs. sales_team (28% vs. 32%)",
        recommendation:
          "Provide partnerships team real-time dashboard; share top-performer playbooks from sales_team",
        potentialImpact:
          "Bringing partnerships team to sales_team conversion rate (+4pp) = +18% partnership revenue",
        actionItems: [
          "Schedule quarterly best-practice workshops (sales ← partnerships knowledge sharing)",
          "Deploy real-time dashboard alerts",
          "Track and share top performer conversations",
        ],
      },
    ],
  };
}

/**
 * Generate HTML/markdown dashboard view
 */
export function generateDashboardMarkdown(metrics: DashboardMetrics): string {
  return `# VENDOR_REQUEST Analytics Dashboard
**Period:** ${metrics.dateRange.start.toISOString().split("T")[0]} to ${metrics.dateRange.end.toISOString().split("T")[0]}
**Generated:** ${new Date().toISOString()}

---

## Executive Summary

| Metric | Value | Status | Target |
|--------|-------|--------|--------|
| Total Inquiries | ${metrics.metrics.totalInquiries} | ↑ +24% | 200 |
| Response Rate | ${metrics.metrics.responsionRate}% | ✅ On Track | 75% |
| Conversion Rate | ${metrics.metrics.conversionRate}% | ⚠️ Below Target | 9% |
| **Pipeline Value** | **₱${(metrics.metrics.pipelineValue / 1_000_000).toFixed(0)}M** | ⚠️ At Risk | ₱500M |
| **Closed Value** | **₱${(metrics.metrics.closedValue / 1_000_000).toFixed(1)}M** | ✅ On Track | ₱35-40M |

---

## Funnel Analysis

\`\`\`
Total Inquiries: ${metrics.metrics.totalInquiries}
        ↓ (${metrics.metrics.responsionRate}% respond)
Responded: ${metrics.metrics.responded}
        ↓ (${metrics.metrics.qualificationRate}% qualify)
Qualified: ${metrics.metrics.qualified}
        ↓ (${metrics.metrics.proposalRate}% send proposal)
Proposal Sent: ${metrics.metrics.proposalSent}
        ↓ (${metrics.metrics.conversionRate}% convert)
Deals Closed: ${metrics.metrics.converted}

Overall Conversion: ${metrics.metrics.overallFunnelConversion}% (Target: 8-10%)
\`\`\`

### By Inquiry Type
${Object.entries(metrics.metrics.inquiriesByType)
  .map(
    ([type, count]) =>
      `- ${type}: ${count} inquiries (${((count / metrics.metrics.totalInquiries) * 100).toFixed(0)}%)`
  )
  .join("\n")}

---

## Performance by Team

### Sales Team
- Response Time: ${metrics.metrics.teamPerformance.sales_team.responsTime}min
- Conversion Rate: ${metrics.metrics.teamPerformance.sales_team.conversionRate}%
- Pipeline Value: ₱${(metrics.metrics.teamPerformance.sales_team.piplineValue / 1_000_000).toFixed(0)}M
- Average Deal: ₱${(metrics.metrics.teamPerformance.sales_team.avgDealValue / 1_000_000).toFixed(1)}M

### Partnerships Team
- Response Time: ${metrics.metrics.teamPerformance.partnerships.responseTime}min ⚠️ (target: 120min)
- Conversion Rate: ${metrics.metrics.teamPerformance.partnerships.conversionRate}% 
- Pipeline Value: ₱${(metrics.metrics.teamPerformance.partnerships.pipelineValue / 1_000_000).toFixed(0)}M
- Average Deal: ₱${(metrics.metrics.teamPerformance.partnerships.avgDealValue / 1_000_000).toFixed(1)}M

### Technical Team
- Response Time: ${metrics.metrics.teamPerformance.technical_team.responseTime}min ✅
- Conversion Rate: ${metrics.metrics.teamPerformance.technical_team.conversionRate}%
- Pipeline Value: ₱${(metrics.metrics.teamPerformance.technical_team.piplineValue / 1_000_000).toFixed(0)}M

---

## Revenue Analysis

### Closed Value by Segment
${Object.entries(metrics.metrics.revenueBySegment)
  .map(
    ([segment, value]) =>
      `- ${segment.toUpperCase()}: ₱${(value / 1_000_000).toFixed(0)}M`
  )
  .join("\n")}

### Pipeline Forecast
- Current Pipeline: ₱${(metrics.metrics.pipelineValue / 1_000_000).toFixed(0)}M
- 90-Day Forecast: ₱${(metrics.metrics.forecastedValue / 1_000_000).toFixed(0)}M
- Annualized (if constant): ₱${(metrics.metrics.annualizedPipeline / 1_000_000).toFixed(0)}M

---

## Benchmarks vs. Targets

${metrics.benchmarks.vs_target
  .map(
    (b) =>
      `### ${b.metric}
- Target: ${b.target}
- Actual: ${b.actual}
- Variance: ${b.variance > 0 ? "+" : ""}${b.variance}%
- Status: **${b.status.toUpperCase()}** ${b.status === "on-track" ? "✅" : "⚠️"}`
  )
  .join("\n\n")}

---

## Key Recommendations

${metrics.recommendations
  .filter((r) => r.priority === "high")
  .map(
    (r, idx) => `
### ${idx + 1}. ${r.finding}

**Recommendation:** ${r.recommendation}

**Expected Impact:** ${r.potentialImpact}

**Action Items:**
${r.actionItems.map((item) => `- ${item}`).join("\n")}
`
  )
  .join("\n")}

---

## Period Comparison

${metrics.benchmarks.vs_previous_period
  .map(
    (c) =>
      `- **${c.metric}**: ${c.previous} → ${c.current} (${c.change > 0 ? "+" : ""}${c.change}% ${c.trend})`
  )
  .join("\n")}

---

**Next Review:** ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}`;
}
