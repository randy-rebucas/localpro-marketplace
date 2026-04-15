# White-Label & PESO Partnership Outreach Execution Guide

**Date:** April 15, 2026  
**Launch Window:** April 18 - June 30, 2026 (Q2 2026)  
**Revenue Target:** ₱50M+ white-label pipeline + ₱35M+ government partnerships

---

## Executive Summary

This guide operationalizes the white-label and PESO partnership strategies created in Enhancement Libraries #2 and #3. Upon activation:

- **White-Label Outreach:** Systematically identify and engage 5-10 franchise/platform partnership opportunities with 60/40→50/50 revenue models
- **PESO Program:** Formalize 3-5 LGU (Local Government Unit) partnerships with workforce registry integration and compliance frameworks
- **Expected Impact:** ₱85M+ combined pipeline (vs. current ₱47M white-label + ₱35M government = ₱82M baseline)

**Timeline:** 2.5 months (Apr 18 - Jun 30)  
**Resource Requirements:** 1 white-label specialist + 1 government relations coordinator  
**Success Metric:** 8 partnerships signed (5 white-label + 3 PESO) by Q3

---

## Part A: White-Label Partnership Expansion (₱50M+ target)

### Phase 1: Candidate Identification (Week 1-2)

#### Target Profile: White-Label Candidates

Using `identifyWhiteLabelTargets()` from `white-label-expansion.ts`:

```
Business Type:
- Regional franchise chains (food, beauty, hospitality)
- Staffing/recruitment platform companies
- Enterprise SaaS looking to expand to Philippines
- SME networks/associations

Qualification Signals:
- Annual transaction volume: ₱10M-500M
- Multi-location operations (5+ branches or regional presence)
- Explicit interest in: white-label, platform integration, franchising
- Industry: Hospitality (+60% white-label interest), Logistics (+45%), Enterprise Software (+80%)

Purchase Power:
- Budget for integration: ₱500K-5M
- Timeline to go-live: 2-6 months
- Decision maker: VP Operations, Chief Technology Officer, Owner

Revenue Potential:
- ₱10-50M annual (Starter/Growth partnership)
- ₱50M+ annual (Pro/Enterprise partnership)
```

#### Discovery Sources

1. **From VENDOR_REQUEST Inquiries (Real-Time)**
   - Query: `SELECT * FROM vendor_requests WHERE inquiryType = 'white_label' OR (inquiryType = 'partnership' AND whiteLabelCandidate = true) ORDER BY submittedAt DESC LIMIT 50`
   - Expected: 8-12 qualified leads from past 90 days
   - Action: Immediate outreach (within 24 hours)

2. **From Existing Enterprise Customers** (Mining current customer base)
   - Identify current HIGH-value customers (₱5M+ annual volume)
   - Check for multi-location or expansion signals
   - Approach: Account manager + white-label specialist joint call
   - Target: 5-8 candidates

3. **From Industry Networks** (Outbound research)
   - Restaurant associations (PRFAA, RHAP)
   - Beauty & wellness networks
   - Logistics operators (PAAAE, CTOAD)
   - Target: 10-15 candidates for warm introduction

4. **From Channel/Agency Partners** (Referral program)
   - Identify agencies/consultants serving target industries
   - Offer revenue share on referrals (5% of annual volume)
   - Target: 3-5 referral partnerships

### Phase 2: Qualification & Discovery Calls (Week 2-4)

#### Week 1 Discovery Call Agenda (30 minutes)

**Objective:** Understand business model, confirm white-label fit, gauge timeline

```
Intro (2 min)
- Introduce LocalPro and white-label offering
- Explain why we're reaching out (identified as great fit)

Business Context (5 min)
- How many locations currently operating?
- What's your growth trajectory (next 12-24 months)?
- Any plans for franchising or nationwide expansion?

Current Staffing Challenges (8 min)
- How do you currently manage hiring across locations?
- What's your biggest pain point (speed, quality, cost)?
- Revenue loss from staffing gaps/delays?

LocalPro Fit (10 min)
- Demo: Show white-label dashboard
- Revenue model: 60/40 split example (at ₱50M volume)
- Integration: 4-6 week implementation timeline
- Support: Dedicated account manager + technical team

Next Steps (5 min)
- Timeline: When could you pilot?
- Investment: Can you allocate ₱500K-1M for integration?
- Decision maker: Who else needs to weigh in?
- Follow-up: Schedule technical deep-dive next week
```

#### Qualification Scorecard

Rate each candidate (0-100):

| Factor | Weight | Scoring |
|--------|--------|---------|
| **Revenue Potential** (₱M annual) | 30% | <10M: 20pts, 10-50M: 50pts, 50M+: 100pts |
| **Timeline to Pilot** | 20% | >6mo: 0pts, 3-6mo: 50pts, <3mo: 100pts |
| **Decision Clarity** | 15% | Unsure: 0pts, Multiple stakeholders: 40pts, Clear owner: 100pts |
| **Cultural Fit** | 15% | Low alignment: 20pts, Medium: 60pts, High: 100pts |
| **Tech Capability** | 10% | Legacy systems: 20pts, Modern stack: 60pts, Cloud-native: 100pts |
| **Integration Scope** | 10% | Complex: 40pts, Standard: 70pts, Simple: 100pts |

**Scoring Interpretation:**
- 80-100: **TIER 1** — Immediate deep-dive (4-week close target)
- 60-80: **TIER 2** — Nurture track (2-3 month close)
- 40-60: **TIER 3** — Monitor for interest signals (6-month pipeline)
- <40: **Pass** — Not ready or misaligned

### Phase 3: Technical Deep-Dive & Proposal (Week 3-6)

For qualified candidates (Tier 1 & 2):

#### Technical Assessment

1. **Current Tech Stack Review**
   - Ask for system architecture diagram
   - Identify integration points (payment, HR, CRM)
   - Assess API maturity (for white-label API design)

2. **Integration Scope Definition**
   - Will they white-label entire LocalPro platform? (Core offering)
   - Or just staffing/dispatch module? (Lighter integration)
   - Custom branding scope (logo, colors, domain)

3. **Timeline & Resource Planning**
   - Development: 2-3 weeks (API integration)
   - QA: 1 week (testing on their data)
   - Training: 3-5 days (their team + our support team)
   - Pilot: 2-4 weeks (real transactions, 10-50 jobs/month)
   - Go-live: Full rollout

#### Proposal Package

Using `generateProposalDocument()` from `white-label-expansion.ts`:

**Contents:**
1. Executive Summary (1 page)
   - Offering overview
   - Financial model
   - Timeline

2. Revenue Model & Commercials (2 pages)
   ```
   Transaction-Based Revenue Share:
   Year 1 Volumes:        Implementation Structure
   ₱10-25M:    60/40      Jan-Mar: Development & integration
   ₱25-50M:    55/45      Apr-May: Pilot & refinement
   ₱50-100M:   50/50      Jun: Go-live
   ₱100M+:     48/52
   
   + Recurring Fees:
   Platform license: ₱50-200K/month (depending on scale)
   ```

2. Implementation Roadmap (1 page)
   - Week 1-2: Needs assessment + system design
   - Week 3-4: Development & integration
   - Week 5: Testing & refinement
   - Week 6-8: Training & soft launch
   - Week 9+: Full production rollout

3. Support & Services (1 page)
   - Dedicated account manager
   - 24/7 technical support
   - Monthly performance reviews
   - Quarterly business reviews (upsell opportunities)

4. Legal Terms & Next Steps (1 page)
   - 1-year initial term
   - 60-day termination clause
   - IP considerations (their brand, our platform)
   - Data ownership & privacy compliance

5. Appendix: Case Studies (1-2 pages)
   - 2-3 anonymized white-label customer examples
   - Results: Revenue generated, efficiency gains, customer satisfaction

### Phase 4: Negotiation & Closing (Week 6-12)

#### Closing Framework

1. **Address Objections**
   - Common: "Revenue share too high" → Show ROI math (net cost per hire drops 40%)
   - Common: "Worried about data/brand" → Explain data isolation + full branding control
   - Common: "Timeline too aggressive" → Offer phased rollout (50% features by week 8)

2. **Prepare Agreement**
   - Use template from `white-label-expansion.ts`
   - Legal review (1-2 weeks)
   - Get signatures

3. **Kick-Off**
   - Schedule implementation kickoff (Week 1 of contract)
   - Assign technical lead + account manager
   - Begin development sprint

#### Success Criteria (Tier 1 Candidate)

| Milestone | Target | Status |
|-----------|--------|--------|
| Discovery call scheduled | Day 2 | □ |
| Qualification score >75 | Day 7 | □ |
| Technical deep-dive completed | Day 14 | □ |
| Proposal sent | Day 18 | □ |
| Legal/financial approval | Day 28 | □ |
| Contract signed | Day 35 | □ |
| Implementation starts | Day 42 | □ |
| Pilot go-live | Day 70 | □ |

### Phase 4 Expected Output

**By End of Q2 (June 30):**
- 3-5 white-label partnerships signed
- ₱30-50M pipeline (projected annual volumes)
- 1-2 partnerships in active implementation
- 1-2 partnerships in pilot phase

---

## Part B: PESO Government Partnership Program (₱35M+ target)

### Phase 1: LGU Target Identification (Week 1-2)

#### Target Profile: LGU Partnerships

Using `identifyLGUTargets()` from `peso-program.ts`:

```
LGU Type (Priority):
1. Metropolitan areas (NCR, Cebu, Davao) — ₱10-20M/LGU potential
2. Tier 1 cities (Quezon City, Makati, etc.) — ₱5-10M/LGU potential
3. Tier 2 cities (100-500K population) — ₱2-5M/LGU potential

Pain Point Alignment:
- High unemployment (especially post-COVID)
- Informal sector workers lacking skills training
- No centralized PESO job platform
- Limited visibility into labor market needs

Governance Agencies to Engage:
- DOLE (Department of Labor) — Workforce registry, certification
- TESDA (Tech-Voc Training) — Skills framework, provider network
- DICT (Digital Transform) — Digitalization initiatives, funding
- LGU PESO offices — Direct implementation partners
```

#### Discovery Sources

1. **DOLE Contact List** (Government agency outreach)
   - DOLE Regional Offices (17 regions)
   - BLR (Bureau of Labor Relations) contact list
   - PESO offices in major cities (500+ locations)

2. **From VENDOR_REQUEST Inquiries** (Real-time government signals)
   - Query: `WHERE message LIKE '%DOLE%' OR '%TESDA%' OR '%government%' OR '%LGU%'`
   - Expected: 4-6 per month
   - Action: Warm outreach via government relations team

3. **From News & Press Releases** (Market intelligence)
   - Monitor government job fairs, skills programs
   - Identify LGU mayors committing to employment programs
   - Target: LGUs launching new programs in next 6 months

4. **From Industry Associations** (Channel partnerships)
   - Chamber of Commerce (business council)
   - PMAP (Private Sector) advocacy groups
   - Get referrals to LGU decision makers

### Phase 2: LGU Engagement & Pilot Qualification (Week 2-5)

#### LGU Decision-Making Process

Government procurement typically requires:
- Sanggunian (city council) approval
- Budget allocation (usually Q4 of prior year)
- Competitive bidding (if procurement amount > ₱500K)
- Test period (3-6 months pilot required)

**Strategy:** Position as pilot program (non-bidding) → Prove ROI → Full procurement

#### LGU Engagement Call Agenda (45 minutes)

**Participants:** PESO Director + Sanggunian Member (usually responsible for employment)

```
Intro (3 min)
- LocalPro background (100K+ providers, 10M+ placements)
- Focus on helping PESO achieve employment targets

Current PESO Challenges (10 min)
- How many jobseekers in your PESO annually?
- How many placements currently? What's target?
- What's the biggest barrier to more placements?
- Current tools/systems used?

LocalPro Workforce Registry Solution (15 min)
- Demo: PESO dashboard (jobseekers, placements, reporting)
- Integration with DOLE data standards
- Mobile app for jobseekers (+ offline support)
- Real-time placement tracking & reporting

PESO Program Details (10 min)
- Pilot: 3 months, 200-500 jobseekers, target 50-100 placements
- No upfront cost for PESO (LocalPro absorbs tech)
- Revenue share: Commission on placements (not on PESO revenue)
- Full brand control: Jobseekers see PESO branding
- Data ownership: All data stays with LGU/DOLE

Next Steps (7 min)
- Proposed pilot start: June 1 (or flexible)
- Timeline: Council approval (1-2 months)
- Contract: MOU for pilot, then full agreement
- Technical: API integration with your current systems
```

#### LGU Qualification Framework

| Factor | Assessment |
|--------|------------|
| **Budget Available** | <₱500K: Lower priority; ₱500K-2M: Target; >₱2M: High priority |
| **Political Will** | Mayor/council commitment to employment programs |
| **Tech Readiness** | Any existing digital systems for PESO? (helps integration) |
| **Geography** | Focus on Metro Manila first, then Tier 1 cities, then Tier 2 |
| **Timeline** | If budget already approved (P2 of year): Move fast; If awaiting budget (Q1): Plan for Q4 procurement |

### Phase 3: Pilot Program Design & MOU (Week 4-8)

#### MOU Structure

For approved pilot candidates:

**Key Terms:**
```
Pilot Duration: 12 weeks (June 1 - August 31)
Pilot Scope:
- 200-500 jobseekers registered
- Target 50-100 placements
- Target ₱50K-100K commission value
- LocalPro covers all tech costs
- PESO dedicates 1 FTE coordinator

Success Metrics (to move to full program):
- Placement rate >20% (50 placements from 250 jobseekers)
- Average placement value ₱1K+ per placement
- PESO team satisfaction (NPS >8)
- 90%+ data accuracy from pilot jobseekers

Post-Pilot Transition (if successful):
- Full-year program: ₱500K-2M budget
- Sanggunian procurement (Q4 of current year)
- Platform available to all PESO jobseekers in LGU
```

#### DOLE Alignment Template

Included in every LGU MOU:

```
DOLE Compliance Framework:
✓ Jobseeker data format (matches DOLE standard reporting)
✓ Monthly KPI reporting (placements, earnings, demographics)
✓ Certification pathway (TESDA-aligned skill certification)
✓ Audit trail (full transparency for government review)
✓ Data protection (DOLE data security standards)
```

### Phase 4: Pilot Execution & Expansion (Week 8-20)

#### Pilot Support Structure

During 12-week pilot:
- **LocalPro:** 1 pilot success manager + 1 technical support person
- **LGU:** 1 PESO coordinator facilitating jobseeker sign-ups
- **Weekly check-ins:** Monitor KPIs, address blockers

#### Go-Live Metrics

**Success = Proceed to Full Program**
- Placement rate: ≥20%
- Jobseeker satisfaction: NPS ≥7
- System reliability: 99%+ uptime
- PESO team adoption: 80%+ weekly active users

**Below Targets = Extended Pilot**
- Additional 4-8 weeks with intensified marketing
- Root cause analysis (tech, marketing, quality issues)
- Adjustment plan before full procurement

#### Expansion to Provincial Coverage

Successful urban pilot + government momentum → Scale to:
- 5-10 additional LGUs (Tier 1 cities)
- 2-5 additional LGUs (Tier 2 cities)
- Regional coordination with DOLE offices

### Phase 4 Expected Output

**By End of Q2 (June 30):**
- 2-3 pilot MOUs signed (NCR + 1-2 tier-1 cities)
- ₱25-35M pipeline (projected annual volumes at scale)
- 1-2 pilots actively running (first month data)
- Government media coverage (press releases highlighting employment impact)

---

## Combined Execution Timeline

| Week | White-Label | PESO Program |
|------|-------------|--------------|
| **Week 1-2** | Candidate ID (8-12) | LGU target ID (6-10) |
| **Week 2-4** | Discovery calls (5-7) | LGU engagement calls (3-4) |
| **Week 3-5** | Proposals sent (3-4) | MOUs drafted (2-3) |
| **Week 4-6** | Negotiations (2-3) | Sanggunian approval process |
| **Week 6-8** | Contracts signed (1-2) | Pilot MOUs finalized |
| **Week 8-12** | Implementation kicks off (1st partner) | Pilot execution begins |
| **Week 12-16** | Pilot launch (1st partner) | Pilot results analysis |
| **Week 16-20** | Production go-live (1st partner) | Full program procurement process |
| **By Week 26** | 3-5 partnerships active | 3-5 LGU partnerships launched |

---

## Success Metrics & KPIs

### White-Label Track

```
Metric                          Target      Track Progress
Qualified candidates identified   10+        ___/10
Discovery calls completed         7+         ___/7
Proposals sent                    4+         ___/4
Contracts signed                  3+         ___/3
In implementation                 2+         ___/2
Pilot launches                    1+         ___/1
Annualized revenue potential      ₱50M+      ₱___M
```

### PESO Government Track

```
Metric                          Target      Track Progress
LGU targets identified            10+        ___/10
Engagement calls completed        5+         ___/5
MOUs negotiated                   3+         ___/3
Pilot agreements signed           3+         ___/3
Active pilots running             2+         ___/2
Placements in pilots (12 weeks)   150+       ___
Annualized revenue potential      ₱35M+      ₱___M
```

### Combined Impact (by June 30)

- **White-Label:** ₱30-50M pipeline + 1-2 implementations
- **PESO:** ₱25-35M pipeline + 2-3 active pilots
- **Total:** ₱55-85M new pipeline (vs. ₱82M existing)
- **Revenue Growth:** +12-18% incremental partnership revenue by Q3

---

## Team Assignments

### White-Label Specialist Role
- Owns candidate sourcing & qualification
- Conducts discovery calls
- Manages technical deep-dives with partners
- Negotiates contracts
- Onboards & supports partners through pilot
- **Experience Required:** 3-5 years enterprise sales + platform/SaaS knowledge

### Government Relations Coordinator
- LGU target identification
- Government stakeholder relationship building
- DOLE/TESDA alignment
- MOU negotiation
- Pilot success management
- **Experience Required:** 2-3 years government affairs + startup B2B experience

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| White-label partners delay decision | Medium | Schedule slip | Provide phased implementation options |
| Government pilots lose momentum | Medium | ₱10-15M pipeline loss | Assign dedicated pilot success manager |
| Integration complexity exceeds estimate | Medium-High | Timeline breach | Begin architecture reviews early (week 1) |
| Budget constraints emerge | Low | Deal size reduction | Offer pricing flexibility (volume commitments) |
| Team capacity insufficient | Medium | Quality issues | Cross-train + consider contract specialists |

---

## Next Steps (Immediate)

1. **Hire white-label specialist** (by April 18) — Or assign from current team
2. **Assign government relations coordinator** (by April 18)
3. **Brief sales & partnerships teams** on outreach strategy (Apr 16)
4. **Create candidate lists** (April 16-17)
5. **Schedule first discovery calls** (April 18+)
6. **Weekly progress reviews** (every Monday 10am)

---

**Document Version:** 1.0  
**Last Updated:** April 15, 2026  
**Owner:** Sales & Partnerships Team  
**Status:** Ready for Execution
