/**
 * Managed Services Tier for MSMEs & Sole Proprietors
 * 
 * Offers done-for-you workforce staffing & management services
 * as value-added upsell or replacement for direct hiring
 */

export interface ManagedServicesTier {
  name: string;
  description: string;
  monthlyFee: number;
  staffAllocation: number; // hours per week or dedicated staff
  includedServices: string[];
  targetSegment: "msme" | "small_team" | "agency";
  breakEvenPoint: number; // transaction volume where self-service is better
}

export interface ManagedStaffingRequest {
  clientId: string;
  serviceCategory: string;
  frequency: "one-time" | "recurring" | "as-needed";
  hoursPerWeek?: number;
  staffQualifications: string[];
  budget: number;
  location: string;
  specialRequirements?: string;
}

export interface ManagedStaffingProposal {
  clientName: string;
  proposalDate: string;
  monthlyFee: number;
  estimatedStaffing: {
    dedicatedStaff: number;
    flexibleStaff: number;
  };
  roi: {
    monthlyCostWithoutManaged: number;
    estimatedSavings: number;
    breakEvenMonths: number;
  };
  serviceTerms: string[];
}

/**
 * Generate Managed Services tier offerings
 */
export function generateManagedServicesTiers(): ManagedServicesTier[] {
  return [
    {
      name: "Staffing Essentials",
      description: "Done-for-you staffing for recurring needs",
      monthlyFee: 15_000,
      staffAllocation: 20, // 20 hours/week of dedicated staffing support
      targetSegment: "msme",
      includedServices: [
        "Provider sourcing & recruitment (up to 10 providers)",
        "Weekly scheduling & coordination",
        "Real-time staff monitoring (SMS alerts)",
        "Issue escalation & replacement staffing",
        "Monthly performance report",
        "24/7 support hotline",
      ],
      breakEvenPoint: 200_000, // ~13 transactions/week @ ₱2,400 avg
    },
    {
      name: "Staffing Plus",
      description: "Premium staffing with analytics & optimization",
      monthlyFee: 35_000,
      staffAllocation: 50, // 50 hours/week
      targetSegment: "small_team",
      includedServices: [
        "Everything in Essentials, plus:",
        "Dedicated Account Manager (2 hours/week consultation)",
        "Provider training & certification",
        "Advanced analytics dashboard (custom KPIs)",
        "Quarterly strategy reviews",
        "Payroll integration & payment processing",
        "Compliance reporting automation",
      ],
      breakEvenPoint: 500_000, // ~33 transactions/week
    },
    {
      name: "Fullscale Management",
      description: "Complete workforce management outsourcing",
      monthlyFee: 75_000,
      staffAllocation: 100, // Full-time dedicated team
      targetSegment: "agency",
      includedServices: [
        "Everything in Plus, plus:",
        "Executive-level reporting (CEO briefing)",
        "Custom workforce strategy consulting",
        "Provider development programs",
        "White-glove onboarding support",
        "Custom integrations with HR systems",
        "Dedicated on-site support (1x/month)",
      ],
      breakEvenPoint: 1_500_000, // ~100 transactions/week
    },
  ];
}

/**
 * Calculate ROI for managed services vs. DIY
 */
export function calculateManagedServicesROI(
  currentTransactionVolume: number,
  staffingHoursPerWeekNeeded: number,
  hourlyRateForManual: number = 300 // typical MSME admin rate
): ManagedStaffingProposal {
  // Estimate which tier they should target
  let selectedTier: ManagedServicesTier;
  let monthlyManualCost: number;

  if (currentTransactionVolume < 200_000) {
    selectedTier = generateManagedServicesTiers()[0]; // Essentials
    monthlyManualCost = staffingHoursPerWeekNeeded * 4 * hourlyRateForManual; // 4 weeks
  } else if (currentTransactionVolume < 500_000) {
    selectedTier = generateManagedServicesTiers()[1]; // Plus
    monthlyManualCost = staffingHoursPerWeekNeeded * 4 * hourlyRateForManual * 1.5; // more complex ops
  } else {
    selectedTier = generateManagedServicesTiers()[2]; // Fullscale
    monthlyManualCost = staffingHoursPerWeekNeeded * 4 * hourlyRateForManual * 2;
  }

  const monthlySavings =
    monthlyManualCost -
    selectedTier.monthlyFee +
    (currentTransactionVolume * 0.03 * 1000) / 12; // 3% cost savings from platform optimization
  const breakEvenMonths = Math.ceil(
    (selectedTier.monthlyFee * 2) / monthlySavings
  );

  return {
    clientName: "[Client Name]",
    proposalDate: new Date().toISOString().split("T")[0],
    monthlyFee: selectedTier.monthlyFee,
    estimatedStaffing: {
      dedicatedStaff: Math.ceil(selectedTier.staffAllocation / 40), // convert hours to FTE
      flexibleStaff: Math.ceil(staffingHoursPerWeekNeeded / 40),
    },
    roi: {
      monthlyCostWithoutManaged: monthlyManualCost,
      estimatedSavings: monthlySavings,
      breakEvenMonths,
    },
    serviceTerms: [
      "3-month minimum contract",
      "Monthly billing, auto-renew",
      "Full transparency (real-time dashboards)",
      "Guaranteed SLA (99% provider availability)",
      "White-label service delivery (your brand)",
      "Cancel with 60-day notice",
    ],
  };
}

/**
 * Generate managed services pitch for MSME upsell
 */
export function generateManagedServicesPitch(clientName: string): string {
  return `Subject: [PERSONALIZED] Take Staffing Off Your Plate → Focus on Growth

Hi ${clientName},

I noticed you've scaled to ${clientName} is now running 50+ staffing jobs/week. That's fantastic growth! 🎉

But I'm guessing staffing coordination is eating up 3-5 hours of your time per week:
✗ Calling providers to confirm availability
✗ Swapping last-minute cancellations
✗ Handling no-shows and quality issues
✗ Processing payments and tracking hours

What if I told you we could take ALL of that off your plate—and actually *save* you money?

## The LocalPro Managed Services Opportunity

We've launched **Staffing Essentials**—a done-for-you service where we:

✓ Source & recruit verified staff for your needs
✓ Handle all scheduling & real-time coordination (SMS alerts)
✓ Step in immediately for cancellations/no-shows
✓ Monitor quality & escalate issues
✓ Process all payments automatically
✓ Give you a monthly performance report

**The Economics:**
- Current estimated cost of staffing coordination: ₱${(15_000 / 2).toLocaleString()}/month (your time + overhead)
- Managed Services fee: ₱15,000/month
- **Your savings:** ₱${(7_500).toLocaleString()}-15,000/month + 10+ hours of your time
- **Plus:** 3-5% efficiency gains from our provider matching algorithm

**Break-even:** Usually within 30-60 days as we optimize your staffing mix.

## Why Now?

You're at the inflection point where:
1. **Scaling gets harder:** DIY staffing management hits a wall at 50-100 jobs/week
2. **Staff costs increase:** Manual coordination becomes expensive inefficiency
3. **Quality issues surface:** Without systems, provider quality becomes inconsistent
4. **Growth stalls:** Your team is managing logistics instead of growing business

Managed Services removes this bottleneck entirely.

## What Would This Look Like for You?

**Month 1:**
- We ramped with your top 5 service categories
- Onboard 15-20 qualified providers for your needs
- Take over all scheduling & coordination
- You review our work and provide feedback

**Month 2-3:**
- Expand to all your service categories
- Optimize provider matching (reduce last-minute swaps)
- Integrate with your systems (SMS, calendar, payroll if needed)
- See efficiency gains & cost savings

**By Month 4:**
- You're operating at 110% efficiency vs. DIY
- Staffing is fully outsourced
- You've freed 15+ hours/week for actual business growth
- ROI is clear and measurable

## Next Step

I'd like to schedule a 20-minute call this week to:
1. Walk through your current staffing pain points
2. Show you how Managed Services eliminates them
3. Run the numbers on cost vs. savings
4. Answer any questions

How does **[TIME/DATE]** look for you?

Looking forward to helping you scale without the staffing headache.

Best,
LocalPro Account Manager`;
}

/**
 * Generate managed services service level agreement
 */
export function generateManagedServicesSLA(
  clientName: string,
  tierLevel: "essentials" | "plus" | "fullscale"
): string {
  const slaTargets: {
    [key in "essentials" | "plus" | "fullscale"]: {
      responseTime: string;
      providerAvailability: string;
      qualityScore: string;
      uptime: string;
    };
  } = {
    essentials: {
      responseTime: "< 4 hours",
      providerAvailability: "95%",
      qualityScore: "≥ 4.0/5.0",
      uptime: "99%",
    },
    plus: {
      responseTime: "< 2 hours",
      providerAvailability: "98%",
      qualityScore: "≥ 4.3/5.0",
      uptime: "99.5%",
    },
    fullscale: {
      responseTime: "< 1 hour",
      providerAvailability: "99%",
      qualityScore: "≥ 4.5/5.0",
      uptime: "99.9%",
    },
  };

  const targets = slaTargets[tierLevel];

  return `# Managed Services Agreement
**Client:** ${clientName}
**Service Tier:** ${tierLevel.charAt(0).toUpperCase() + tierLevel.slice(1)}
**Effective Date:** ${new Date().toISOString().split("T")[0]}

---

## Service Level Targets

LocalPro commits to the following service levels:

| Metric                     | Target       | Measurement |
|----------------------------|--------------|-------------|
| Response Time to Issues    | ${targets.responseTime}        | Phone/SMS |
| Provider Availability      | ${targets.providerAvailability}          | Monthly |
| Quality Score (Avg Rating) | ${targets.qualityScore}      | Client feedback |
| Platform Uptime            | ${targets.uptime}         | 24/7 monitoring |
| Escalation Resolution      | 24-48 hours  | Issue ticket |

---

## What's Included

${
  tierLevel === "essentials"
    ? `
- Provider sourcing & recruitment
- Weekly scheduling & coordination
- Real-time SMS alerts
- Issue escalation & replacement staff
- Monthly performance report
- 24/7 support hotline
`
    : tierLevel === "plus"
      ? `
- All Essentials services
- Dedicated Account Manager (2 hrs/week)
- Provider training & certification
- Advanced analytics dashboard
- Quarterly strategy reviews
- Payroll integration
- Compliance reporting
`
      : `
- All Plus services
- Executive reporting
- Workforce strategy consulting
- Provider development programs
- White-glove onboarding
- Custom HR integrations
- On-site support (1x/month)
`
}

---

## Not Included

- Client's internal HR/admin tasks outside staffing coordination
- Benefits administration or employment contracts
- Tax/payroll legal services (we can recommend partners)
- Custom software development (beyond standard features)

---

## Support & Escalation

**Tier 1 (Operational Issues):** 
- Response: 4 hours
- Channel: SMS, email, phone

**Tier 2 (Business Issues):**
- Response: 24 hours
- Channel: Account Manager + phone

**Tier 3 (Strategic Issues):**
- Response: 48 hours
- Channel: Leadership conversation

---

## Performance Guarantees

If we fail to meet SLA targets in any month:

- **1st month miss:** Waive 10% of fees
- **2nd consecutive miss:** Waive 25% of fees
- **3rd consecutive miss:** Client can exit without penalty

---

## Term & Termination

- **Initial Term:** 3 months
- **Auto-Renewal:** Monthly after initial term
- **Cancellation:** 60-day notice required
- **Early Termination:** Allowed with 60-day notice (no penalty after 3-month initial term)

---

## Confidentiality

Both parties agree to keep all business information confidential and not disclose to third parties without written consent.

---

**Agreed:** _____________________ (Client Signature)
**Date:** _______________________`;
}

/**
 * Identify MSME upsell targets for managed services
 */
export function identifyManagedServicesUpsellTargets(): Array<{
  businessName: string;
  currentVolume: "medium" | "high" | "very_high";
  estimatedWeeklyJobs: number;
  painPoints: string[];
  recommendedTier: "essentials" | "plus" | "fullscale";
}> {
  return [
    {
      businessName: "Metro Cleaning Services",
      currentVolume: "high",
      estimatedWeeklyJobs: 60,
      painPoints: [
        "No-shows affecting customer satisfaction",
        "Manual scheduling takes 5 hours/week",
        "Quality inconsistency across 20 providers",
      ],
      recommendedTier: "plus",
    },
    {
      businessName: "BuildFast Construction",
      currentVolume: "very_high",
      estimatedWeeklyJobs: 95,
      painPoints: [
        "Urgent project delays due to staff coordination",
        "Hard to scale safely (can't hire more admin)",
        "No real-time visibility into field status",
      ],
      recommendedTier: "fullscale",
    },
    {
      businessName: "Salon Networks PH",
      currentVolume: "medium",
      estimatedWeeklyJobs: 40,
      painPoints: [
        "Expanding to 5 locations (coordination nightmare)",
        "Staff hiring/training is biggest pain point",
        "Can't keep up with booking volume",
      ],
      recommendedTier: "essentials",
    },
  ];
}
