# AI Chat Dispatcher - Phase 2 Implementation Plan

**Timeline:** 3-5 days  
**Expected Coverage:** 65% of real user scenarios (up from 45%)  
**Estimated Revenue Impact:** +₱2.1B additional booking capacity  

---

## Overview

Phase 2 builds on Phase 1's foundation by implementing 4 additional high-priority intents that capture the next tier of common user requests. These intents represent 20% of user base but handle complex multi-step workflows.

---

## Phase 2 Intents

### Intent 1: BOOKING_INQUIRY (Priority: High)
**User Coverage:** 12% (~4.8M users)  
**Revenue Value:** ₱480M  
**Implementation Complexity:** Medium  

**Description:**  
Users asking general questions about booking process, requirements, payment, security, etc. Not yet ready to post a specific job but gathering information.

**Example Prompts:**
- "How do I post a job and what information do I need?"
- "Is my payment secure? How does escrow work?"
- "What if I'm not happy with the provider?"
- "Can I see the provider's background check?"
- "How long does it take to get a response?"

**Implementation Approach:**

**1. Keyword Detection** (in system prompt)
```
BOOKING_INQUIRY keywords:
- "how do I", "how can I", "how does", "how long"
- "requirements", "need", "what info", "background check"
- "secure", "safe", "payment", "escrow", "refund"
- "process", "steps", "works", "guarantee"
```

**2. Intent-Specific Response Logic**
```typescript
// In route.ts handler
if (intent.nextAction === "SHOW_BOOKING_INFO") {
  // Generate contextual FAQ response
  // Retrieve relevant knowledge base articles
  // Format response with links to help docs
}
```

**3. API Endpoint:** `/api/ai/chat/booking-info` (GET or POST)
```
Input: questionType (process|payment|security|provider|timeline)
Output: 
  - message: Formatted answer
  - links: Related help articles
  - faq: Related FAQs
  - nextAction: PROCEED_TO_BOOKING or CONTINUE_CHAT
```

**4. Frontend Integration:**
- Display help links within chat
- Track which questions users ask (analytics)
- Suggest next actions based on question answered

**Database Requirements:**
- Knowledge base table (existing? check)
- FAQ entries for each category
- Help article links

**Estimated Implementation:** 1 day

---

### Intent 2: URGENT_SERVICE (Priority: High)
**User Coverage:** 9% (~3.6M users)  
**Revenue Value:** ₱540M (higher urgency = higher willingness to pay)  
**Implementation Complexity:** Medium  

**Description:**  
Users indicating they need service ASAP (today, within hours, emergency). Different from regular booking - requires special filtering and prioritization.

**Example Prompts:**
- "I need a plumber right now! My pipe burst!"
- "Can someone come today? It's urgent."
- "Emergency! My AC is broken in this heat."
- "Need someone ASAP within the next 2 hours"
- "This is an emergency, I need help immediately"

**Implementation Approach:**

**1. Urgency Level Detection**
```typescript
type UrgencyLevel = "routine" | "soon" | "urgent" | "emergency";

// Keywords mapping
const urgencyMap = {
  emergency: ["emergency", "urgent!", "right now", "asap", "immediately", "critical"],
  urgent: ["urgent", "asap", "today", "within hours", "hurry"],
  soon: ["this week", "tomorrow", "next few days"],
  routine: ["whenever", "flexible", "no rush"],
};
```

**2. API Endpoint:** `/api/ai/chat/urgent-service` (POST)
```
Input:
  jobData: { category, description, location, urgencyLevel }
  
Output:
  - providers: FILTERED by:
    - Availability RIGHT NOW
    - Historical response time < 5 minutes
    - Rating ≥ 4.7 (higher threshold for urgent)
  - estimatedArrival: ETA for each provider
  - premiumOptions: Offer priority guarantee (extra fee)
```

**3. Provider Filtering Logic**
- Query providers with real-time availability flag
- Sort by distance (mobile location needed)
- Calculate ETA based on provider-client distance
- Highlight providers with urgent job experience

**4. Frontend Display:**
- Show "⚡ URGENT" badge
- Display provider ETA prominently
- Show "Premium Urgent" option (ux consideration)
- Real-time ETA updates every 10 seconds

**Database Requirements:**
- Provider real-time availability tracking
- Mobile location data (if available)
- Urgent job history stats per provider
- Premium urgent pricing tier

**Estimated Implementation:** 1.5 days

---

### Intent 3: SWITCH_PROVIDER (Priority: Medium)
**User Coverage:** 6% (~2.4M users)  
**Revenue Value:** ₱210M  
**Implementation Complexity:** High  

**Description:**  
User mid-job wants to replace current provider, either due to poor work, communication issues, or changed needs. Complex workflow involving provider communication and job reassignment.

**Example Prompts:**
- "I want to cancel my current provider and find someone new"
- "Can I switch to a different provider? This one isn't working out."
- "The provider isn't responding. I need someone else."
- "I'm not happy with this provider's work. Can you find me another?"
- "I need a different provider who specializes in X"

**Implementation Approach:**

**1. Validation Requirements**
```typescript
// Must have active assigned job
if (!job || job.status !== "assigned_or_in_progress") {
  return error("No active job to switch provider from");
}

// Cannot switch too many times (fraud prevention)
if (switchCount > 5) {
  return error("Multiple switches detected. Please contact support.");
}

// Min time with current provider (prevent gaming)
if (timeWithProvider < 1_hour) {
  return error("Please give provider at least 1 hour");
}
```

**2. Workflow**
```
1. User requests provider switch
2. Capture reason: poor_work | not_responding | other_reason
3. Show warning: "Current provider will be notified"
4. Search for replacement providers using same job data
5. Allow selection of new provider
6. Notify current provider: "Client requesting new provider"
7. Create new job with same spec
8. Refund any paid amount? (per policy)
9. Archive old job with "provider_switch" reason
```

**3. API Endpoint:** `/api/ai/chat/switch-provider` (POST)
```
Input:
  jobId: string
  reason: "poor_work" | "not_responding" | "other"
  feedback: string (optional)
  
Output:
  - message: Confirmation message
  - replacement_providers: Top 5 alternatives
  - warnings: Policy implications
  - refund_info: If applicable
```

**4. Data Model Updates**
```typescript
// Job document needs
- switchHistory: Array<{
    fromProviderId: ObjectId,
    reason: string,
    timestamp: Date,
    feedback: string,
  }>
- switchCount: number
```

**Database Requirements:**
- Track provider switches per job
- Track switch reasons for analytics
- Refund/credit logic
- Notification system for current provider

**Estimated Implementation:** 2 days

---

### Intent 4: VENDOR_REQUEST (Priority: Medium)
**User Coverage:** 5% (~2M users)  
**Revenue Value:** ₱180M  
**Implementation Complexity:** High  

**Description:**  
Business/agency clients requesting a "vendor account" or partnership inquiries. Looking for terms, volume rates, featured placement, API access, etc.

**Example Prompts:**
- "We're a cleaning company. Can we partner with LocalPro?"
- "I want to set up a vendor account for my business"
- "Do you offer wholesale/bulk provider accounts?"
- "What are the terms for a cleaning agency to work with you?"
- "Can we get an API integration for our booking system?"

**Implementation Approach:**

**1. Vendor Classification**
```typescript
type VendorType = "sole_proprietor" | "small_team" | "agency" | "enterprise";
type VendorRequest = "vendor_account" | "partnership" | "api_access" | "white_label";
```

**2. Response Routing**
```typescript
if (intent === "VENDOR_REQUEST") {
  // Route to specialized handling
  if (vendorType === "enterprise") {
    assignTo("sales_team");
  } else if (requestType === "api_access") {
    assignTo("technical_team");
  } else {
    assignTo("vendor_onboarding");
  }
  
  return {
    message: "Thanks for your interest! Our team will contact you...",
    requestId: generateId(),
    estimatedResponse: "24-48 hours",
    actionItems: generateActionItems(),
  };
}
```

**3. API Endpoint:** `/api/ai/chat/vendor-request` (POST)
```
Input:
  vendorData: {
    businessName: string,
    vendorType: VendorType,
    requestType: VendorRequest[],
    businessInfo: string,
  }
  
Output:
  - requestId: Unique request ID
  - estimatedResponse: Timeline
  - nextSteps: What happens next
  - contactInfo: Account manager assignment
```

**4. Backend Flow**
```
1. Create VendorRequest document
2. Route to appropriate team (sales, devops, partner mgmt)
3. Generate request ID and send to user
4. Set up team notification
5. Schedule follow-up in 24 hours
6. Return tracking info to user
```

**5. Data Model**
```typescript
VendorRequest: {
  _id: ObjectId,
  businessName: string,
  vendorType: string,
  requestTypes: string[],
  userId: ObjectId,
  createdAt: Date,
  status: "pending" | "in_review" | "approved" | "rejected",
  assignedTo: ObjectId, // Team member
  notes: string,
}
```

**Database Requirements:**
- VendorRequest collection
- Team member assignments
- Notification queue for sales team
- Request tracking/analytics

**Estimated Implementation:** 1.5 days

---

## Phase 2 Implementation Timeline

| Day | Task | Deliverable |
|-----|------|-------------|
| 1 | BOOKING_INQUIRY (API + integration) | Route + component handler |
| 1-2 | URGENT_SERVICE (APIs + location logic) | Route + provider filtering + ETA |
| 2-3 | SWITCH_PROVIDER (complex workflow) | Route + notifications + refund logic |
| 3-4 | VENDOR_REQUEST (team routing) | Route + assignment + tracking |
| 4-5 | Testing + QA | Test suite + manual validation |
| 5 | Documentation + Review | Architecture docs + sign-off |

---

## Common Implementation Patterns

### Pattern 1: Knowledge Base / FAQ Endpoint
Used by: BOOKING_INQUIRY  
```typescript
// lib/knowledge.ts (already exists?)
export async function searchKnowledge(category: string, query: string) {
  return await Knowledge.find({
    $or: [
      { category: category },
      { keywords: { $in: query.split(" ") } }
    ]
  }).limit(3);
}
```

### Pattern 2: Provider Filtering with Custom Logic
Used by: URGENT_SERVICE, SWITCH_PROVIDER  
```typescript
// lib/chat-dispatcher.ts
export async function searchProvidersAdvanced(
  jobData: any,
  filters: {
    minRating?: number,
    maxDistance?: number,
    availability?: "now" | "today" | "any",
    excludeProviders?: string[],
  }
) {
  // Advanced filtering logic
}
```

### Pattern 3: Workflow/Action Logging
Used by: SWITCH_PROVIDER, VENDOR_REQUEST  
```typescript
// Update Job/Request with action history
job.actions = job.actions || [];
job.actions.push({
  type: action_type,
  by: user._id,
  reason: reason,
  timestamp: Date.now(),
});
```

### Pattern 4: Team Assignment / Routing
Used by: VENDOR_REQUEST, partially URGENT_SERVICE  
```typescript
// lib/team-routing.ts
export async function routeToTeam(requestType: string, urgency: string) {
  const team = await Team.findOne({ 
    specialties: requestType,
    capacity: { $gt: 0 }
  });
  return team;
}
```

---

## Phase 2 Coverage projection

| Intent | Coverage | Users | Revenue |
|--------|----------|-------|---------|
| BOOKING_INQUIRY | 12% | 4.8M | ₱480M |
| URGENT_SERVICE | 9% | 3.6M | ₱540M |
| SWITCH_PROVIDER | 6% | 2.4M | ₱210M |
| VENDOR_REQUEST | 5% | 2M | ₱180M |
| **Total Phase 2** | **32%** | **12.8M** | **₱1.41B** |
| **Combined (P1+P2)** | **77%** | **24.8M** | **₱2.574B** |

---

## Success Criteria

✅ All 4 new intents implemented and tested  
✅ Intent detection accuracy > 85% for each type  
✅ API response times < 2 seconds  
✅ Zero auth/security issues  
✅ Proper notification delivery to relevant teams  
✅ Comprehensive test coverage  
✅ Documentation complete  

---

## Blockers & Dependencies

| Blocker | Impact | Resolution |
|---------|--------|-----------|
| Knowledge base not populated | BOOKING_INQUIRY | Populate KB from support docs |
| Real-time provider availability | URGENT_SERVICE | Implement availability polling |
| Team member assignments | VENDOR_REQUEST | Set up team structure + permissions |
| Job refund policy | SWITCH_PROVIDER | Clarify with business team |

---

## Rollout Strategy

**Option A: Full Rollout**
- Deploy all 4 intents simultaneously
- Pros: Comprehensive solution, better analytics
- Cons: Higher risk if issues arise

**Option B: Staged Rollout (Recommended)**
1. Week 1: BOOKING_INQUIRY (lowest risk, high value)
2. Week 2: URGENT_SERVICE (medium risk, very valuable)
3. Week 3: SWITCH_PROVIDER (higher risk, test thoroughly)
4. Week 4: VENDOR_REQUEST (complex workflow, time to perfect)

Benefits of staged:
- Early detection of issues
- Time to refine based on usage
- Gradual team adoption
- Continuous value delivery

---

## Next Steps

1. ✅ Review Phase 2 plan with team
2. ⏳ Get approval from product/business
3. ⏳ Assign developers (est. 2-3 devs)
4. ⏳ Begin implementation Day 1
5. ⏳ Daily sync-ups for blockers
6. ⏳ Testing phase verification
7. ⏳ Staged rollout execution
8. ⏳ Monitor metrics post-launch

---

**Prepared:** April 11, 2026  
**Phase 1 Status:** ✅ Complete  
**Phase 2 Ready:** ⏳ Pending Approval
