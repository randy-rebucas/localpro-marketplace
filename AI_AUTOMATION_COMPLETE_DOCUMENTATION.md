# LocalPro AI Automation - Complete Implementation Guide
**Last Updated:** April 21, 2026  
**Status:** ✅ 11 AI Agents Deployed | ✅ Approval Queue Active | ✅ Metrics Dashboard Live

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [AI Agents (1-11)](#ai-agents-1-11)
3. [Core Systems](#core-systems)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Integration Points](#integration-points)
7. [Workflow Examples](#workflow-examples)
8. [Testing](#testing)
9. [Monitoring & Metrics](#monitoring--metrics)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    LocalPro Platform                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Chat API   │  │ Agent APIs   │  │  Suggestion  │           │
│  │  (Intent)    │  │ (Decisions)  │  │    APIs      │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                    │
│         └─────────────────┼──────────────────┘                    │
│                           │                                       │
│                    ┌──────▼────────┐                              │
│                    │  AI Decision  │                              │
│                    │    Service    │                              │
│                    └──────┬────────┘                              │
│                           │                                       │
│         ┌─────────────────┼─────────────────┐                     │
│         │                 │                 │                     │
│   ┌─────▼──────┐   ┌─────▼──────┐  ┌──────▼───────┐             │
│   │ Decision   │   │ Approval   │  │   Feedback   │             │
│   │ Collection │   │   Queue    │  │  Collection  │             │
│   └────────────┘   └────────────┘  └──────────────┘             │
│                           │                                       │
│                    ┌──────▼────────┐                              │
│                    │   Dashboard   │                              │
│                    │   & Metrics   │                              │
│                    └───────────────┘                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Characteristics
- **Modular:** Each agent is independent and can be deployed separately
- **Async-First:** Decisions are logged and queued for human review
- **Type-Safe:** Full TypeScript with strict types across all systems
- **Observable:** All decisions tracked with full audit trail
- **Scalable:** Horizontal scaling via stateless design

---

## AI Agents (1-11)

### Phase 1-2: Core Operations (Agents 1-3)

#### 1. Support Agent (`support_agent`)
**Purpose:** Customer support ticket triage and first-line resolution

**Endpoint:** `POST /api/ai/agents/support-agent`

**Input:**
```typescript
{
  ticketId?: string;
  userId?: string;
  message: string;
  category?: string;                    // technical_issue, billing, account, etc.
  previousMessages?: string[];
}
```

**Output:**
```typescript
{
  decision: {
    shouldResolveDirectly: boolean;      // Can FAQ resolve this?
    responseType: "resolution" | "escalation" | "clarification";
    confidence: number;                   // 0-100
    riskLevel: "low" | "medium" | "high" | "critical";
  };
  response: string;                       // Suggested response
  actionItems: {
    escalateToSupport: boolean;
    escalationReason?: string;
    suggestedCategory?: string;
    sentiment: "positive" | "neutral" | "negative";
    sentimentScore: number;               // 0-1
  };
}
```

**Database Decision Type:** `SUPPORT`

**Use Cases:**
- Automatic FAQ response for common issues
- Sentiment analysis to detect frustrated users
- Route complex issues to humans
- Auto-categorize tickets

**Performance Target:** <1.5 seconds, 85%+ auto-resolve rate

---

#### 2. Operations Manager (`operations_manager`)
**Purpose:** Job validation and provider-job matching

**Endpoint:** `POST /api/ai/agents/operations-manager`

**Input:**
```typescript
{
  jobId: string;
  jobDetails: {
    title: string;
    description: string;
    category: string;
    budget: number;
    timeline: string;
  };
  clientHistory: {
    completedJobs: number;
    averageRating: number;
    cancellationRate: number;
  };
}
```

**Output:**
```typescript
{
  decision: {
    isValidJob: boolean;
    confidence: number;
    riskFlags: string[];
    shouldAutoApprove: boolean;
  };
  matchedProviders: Array<{
    providerId: string;
    matchScore: number;
    reason: string;
  }>;
}
```

**Database Decision Type:** `VALIDATION`

**Use Cases:**
- Auto-approve legitimate job postings
- Flag suspicious or low-quality jobs
- Suggest best-matched providers
- Prevent scam jobs from going live

**Performance Target:** <2 seconds, 80%+ auto-approve rate

---

#### 3. Dispute Resolver (`dispute_resolver`)
**Purpose:** Analyze disputes and recommend resolution

**Endpoint:** `POST /api/ai/agents/dispute-resolver`

**Input:**
```typescript
{
  disputeId: string;
  evidence: {
    messages: string[];
    photos: string[];                   // URLs
    jobDetails: object;
    claims: Array<{ party: string; claim: string; }>;
  };
  history: {
    clientCompletedJobs: number;
    providerCompletedJobs: number;
    priorDisputes: number;
  };
}
```

**Output:**
```typescript
{
  decision: {
    recommendedOutcome: "client_refund" | "provider_pay" | "split" | "escalate";
    confidence: number;
    reasoning: string;
    refundPercentage?: number;
  };
  evidenceAnalysis: {
    photosQuality: "clear" | "unclear" | "insufficient";
    messageChainClear: boolean;
    contradictions: string[];
  };
}
```

**Database Decision Type:** `DISPUTE`

**Use Cases:**
- Auto-analyze dispute evidence
- Recommend fair resolution
- Detect frivolous claims
- Suggest mediation approach

**Performance Target:** <3 seconds, 70%+ auto-resolve rate

---

### Phase 4: Identity & Fraud (Agents 4-5)

#### 4. KYC Verifier (`kyc_verifier`)
**Purpose:** Verify provider credentials and background

**Endpoint:** `POST /api/ai/agents/kyc-verifier`

**Input:**
```typescript
{
  providerId: string;
  documents: {
    idDocument?: string;                // URL
    licenseDocument?: string;           // URL
    certifications?: string[];          // URLs
  };
  userData: {
    name: string;
    phone: string;
    email: string;
    yearsInBusiness?: number;
    previousJobs?: number;
  };
}
```

**Output:**
```typescript
{
  status: "approved" | "pending_review" | "rejected";
  confidence: number;                   // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  reasons: string[];
  credibilityScore: number;             // 0-100
  recommendedActions: string[];
}
```

**Database Decision Type:** `KYC_VERIFICATION`

**Use Cases:**
- Automated identity verification
- Background check analysis
- Certification validation
- PESO compliance checking
- Flag suspicious applications

**Performance Target:** <2.5 seconds, 75%+ auto-approve rate

---

#### 5. Fraud Detector (`fraud_detector`)
**Purpose:** Monitor transactions and detect fraud patterns

**Endpoint:** `POST /api/ai/agents/fraud-detector`

**Input:**
```typescript
{
  transactionId: string;
  type: "withdrawal" | "booking" | "dispute_resolution" | "refund";
  amount: number;
  userId: string;
  userHistory: {
    totalTransactions: number;
    averageTransactionAmount: number;
    chargebackCount: number;
    disputeCount: number;
    accountAgeInDays: number;
    previousFraudFlags: number;
  };
  transactionDetails: {
    jobId?: string;
    paymentMethod?: string;
    destination?: string;
    timestamps?: {
      accountCreated: string;
      transactionTime: string;
    };
  };
}
```

**Output:**
```typescript
{
  riskScore: number;                    // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  fraudIndicators: string[];
  confidence: number;                   // 0-100
  shouldBlock: boolean;
  recommendedActions: string[];
}
```

**Database Decision Type:** `FRAUD_CHECK`

**Use Cases:**
- Real-time fraud detection
- Chargeback prevention
- Account anomaly detection
- Transaction velocity checks
- Block high-risk transactions

**Performance Target:** <1 second, 90%+ accuracy

---

### Phase 5: Sales (Agent 6)

#### 6. Sales Agent (`sales_agent`) - Vendor Request Handler
**Purpose:** Lead qualification and partnership routing

**Endpoint:** `POST /api/ai/chat/vendor-request`

**Input:**
```typescript
{
  userMessage: string;
  userId: string;
  userEmail: string;
  vendorType: "sole_proprietor" | "small_team" | "agency" | "enterprise";
  inquiryType: "vendor_account" | "partnership" | "api_access" | "white_label";
  businessName?: string;
}
```

**Output:**
```typescript
{
  requestId: string;                    // e.g., TR-1234567890-ABC
  priority: "high" | "medium" | "standard";
  qualificationScore: number;           // 0-100
  recommendedPlan?: "Starter" | "Growth" | "Pro" | "Enterprise";
  upsellOpportunities: string[];
  industryCategory?: string;
  discoveryCallAgenda?: string;
  routingTeam: string;
}
```

**Database Decision Type:** `LEAD_SCORING`

**Use Cases:**
- Vendor onboarding automation
- Partnership qualification
- Revenue opportunity identification
- Route to correct sales team
- Generate discovery agendas

**Performance Target:** <2 seconds, 85%+ qualification accuracy

---

### Phase 6: Booking & Escrow (Agents 7-8)

#### 7. Booking Optimizer (`booking_optimizer`)
**Purpose:** Intelligent provider matching and booking optimization

**Endpoint:** `POST /api/ai/agents/booking-optimizer`

**Input:**
```typescript
{
  jobId: string;
  jobDetails: {
    category: string;
    budget: number;
    timeline: string;
    clientPreferences?: string[];
  };
  availableProviders: Array<{
    providerId: string;
    rating: number;
    completedJobs: number;
    responseTime: number;               // hours
    skills: string[];
    availability: boolean;
  }>;
}
```

**Output:**
```typescript
{
  topMatches: Array<{
    providerId: string;
    matchScore: number;                 // 0-100
    reasoning: string;
  }>;
  recommendedProvider: string;
  alternativeProviders: string[];
  estimatedSuccessRate: number;
}
```

**Database Decision Type:** `BOOKING_MATCH`

**Use Cases:**
- Auto-suggest best providers
- Optimize booking acceptance rate
- Reduce booking cancellations
- Improve client satisfaction
- Balance provider workload

**Performance Target:** <1.5 seconds

---

#### 8. Escrow Manager (`escrow_manager`)
**Purpose:** Automated escrow release decisions

**Endpoint:** `POST /api/ai/agents/escrow-manager`

**Input:**
```typescript
{
  jobId: string;
  escrowId: string;
  jobCompletion: {
    clientConfirmed: boolean;
    confirmationTime?: string;
    completionDate: string;
  };
  jobDetails: {
    amount: number;
    category: string;
    duration: string;
  };
  history: {
    jobCount: number;
    disputeCount: number;
    clientSatisfaction: number;
    providerPerformance: number;
  };
}
```

**Output:**
```typescript
{
  shouldRelease: boolean;
  confidenceScore: number;              // 0-100
  riskAssessment: string;
  reasons: string[];
  recommendedAction: "auto_release" | "hold" | "manual_review";
  estimatedReleaseTime?: string;
}
```

**Database Decision Type:** `ESCROW_RELEASE`

**Use Cases:**
- Auto-release escrow funds
- Prevent premature release
- Hold suspicious transactions
- Speed up payment to providers
- Reduce disputes

**Performance Target:** <1 second, 90%+ auto-release rate

---

### Phase 7: Quality & Growth (Agents 9-11)

#### 9. Proactive Support (`proactive_support`)
**Purpose:** Detect issues and reach out proactively

**Endpoint:** `POST /api/ai/agents/proactive-support`

**Input:**
```typescript
{
  jobId: string;
  userId: string;
  stage: "pre-booking" | "in-progress" | "post-completion";
  signals: {
    clientMessages?: string[];
    rating?: number;
    responseTime?: number;
    completionStatus?: string;
    issueFlags?: string[];
  };
  context: {
    firstTimeClient?: boolean;
    highValueJob?: boolean;
    riskScore?: number;
  };
}
```

**Output:**
```typescript
{
  riskDetected: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  issues: string[];
  proactiveActions: Array<{
    action: string;
    priority: number;                  // 1-10
    message?: string;
  }>;
}
```

**Database Decision Type:** `RISK_DETECTION`

**Use Cases:**
- Detect job at-risk before issues escalate
- Suggest intervention messaging
- Schedule proactive check-ins
- Offer mediation early
- Prevent disputes before they start

**Performance Target:** <1 second

---

#### 10. Review Moderator (`review_moderator`)
**Purpose:** Moderate reviews for spam and abuse

**Endpoint:** `POST /api/ai/agents/review-moderator`

**Input:**
```typescript
{
  reviewId: string;
  review: {
    rating: number;                     // 1-5
    text: string;
    images?: string[];                  // URLs
  };
  jobDetails: {
    category: string;
    amount: number;
    duration: string;
  };
  reviewer: {
    accountAge: number;                 // days
    reviewCount: number;
    avgRating: number;
  };
}
```

**Output:**
```typescript
{
  isLegitimate: boolean;
  suspicionScore: number;               // 0-100
  issues: string[];                     // spam, fake, abusive, etc.
  recommendedAction: "approve" | "hold" | "reject";
  confidence: number;
}
```

**Database Decision Type:** `REVIEW_MODERATION`

**Use Cases:**
- Auto-filter spam reviews
- Detect fake/competitor reviews
- Flag abusive language
- Approve legitimate reviews
- Protect platform reputation

**Performance Target:** <0.8 seconds, 95%+ accuracy

---

#### 11. Outreach Agent (`outreach_agent`)
**Purpose:** Re-engagement and churn prevention

**Endpoint:** `POST /api/ai/agents/outreach-agent`

**Input:**
```typescript
{
  userId: string;
  userType: "client" | "provider";
  userData: {
    accountAge: number;                 // days
    lastActivity: string;               // ISO date
    totalTransactions: number;
    averageRating?: number;
  };
  signals: {
    daysSinceLastJob: number;
    cancellationRate?: number;
    negativeReviews?: number;
    completionRate?: number;
  };
}
```

**Output:**
```typescript
{
  shouldOutreach: boolean;
  churnRisk: "low" | "medium" | "high" | "critical";
  recommendedMessage: string;
  incentiveRecommendation?: string;
  nextAction: "email" | "sms" | "in_app" | "no_action";
  estimatedConversionProbability: number;
}
```

**Database Decision Type:** `OUTREACH_DECISION`

**Use Cases:**
- Identify at-risk users before churn
- Generate personalized re-engagement messages
- Recommend appropriate incentives
- Schedule outreach campaigns
- Improve retention metrics

**Performance Target:** <1 second, 60%+ re-engagement rate

---

## Core Systems

### AI Decision Service

**Location:** `src/services/ai-decision.service.ts`

**Key Methods:**

#### `createDecision(input: CreateDecisionInput)`
Creates a new decision pending approval.

```typescript
await AIDecisionService.createDecision({
  type: "KYC_VERIFICATION",
  agentName: "kyc_verifier",
  recommendation: "Provider identity verified",
  confidenceScore: 92,
  riskLevel: "low",
  supportingEvidence: {
    credibilityScore: 95,
  },
  relatedEntityType: "lead",
  relatedEntityId: providerId,
});
```

#### `getPendingDecisions(filters: ApprovalQueueFilters)`
Retrieves pending decisions for approval dashboard.

```typescript
const { decisions, total } = await AIDecisionService.getPendingDecisions({
  status: "pending_review",
  riskLevel: ["high", "critical"],
  limit: 50,
  skip: 0,
  sortBy: "riskLevel",
});
```

#### `approveDecision(decisionId, userId, notes?)`
Approves a pending decision.

```typescript
await AIDecisionService.approveDecision(
  decisionId,
  adminUserId,
  "Confirmed - provider verified"
);
```

#### `rejectDecision(decisionId, userId, reason)`
Rejects a pending decision.

```typescript
await AIDecisionService.rejectDecision(
  decisionId,
  adminUserId,
  "ID document unclear - request resubmission"
);
```

#### `recordFeedback(decisionId, feedback: AIFeedback)`
Records human feedback for model improvement.

```typescript
await AIDecisionService.recordFeedback(decisionId, {
  wasCorrect: true,
  userOverride: false,
  confidence: 92,
});
```

#### `getAgentAccuracyMetrics(agentName?)`
Gets performance metrics for agents.

```typescript
const metrics = await AIDecisionService.getAgentAccuracyMetrics("kyc_verifier");
// Returns: { totalDecisions, correctDecisions, accuracyRate, overrideRate, ... }
```

---

### Approval Queue System

**Location:** `src/app/(dashboard)/admin/approval-queue/`

**Features:**
- Real-time queue of pending decisions
- Bulk approval/rejection
- Risk-based filtering
- Agent-specific views
- Performance metrics per agent

**Dashboard Filters:**
```
- Status: pending_review, approved, rejected, escalated
- Risk Level: low, medium, high, critical
- Agent: Any of 11 agents
- Sort By: Risk Level, Confidence Score, Date Created
```

**Bulk Operations:**
```
- Approve All: Auto-approve visible items
- Reject All: Bulk reject with reason
- Assign to Team: Route for manual review
- Export: Download decision data
```

---

### Metrics Dashboard

**Location:** `src/app/(dashboard)/admin/ai-metrics/`

**Display Metrics:**

**Summary Cards:**
- Total Decisions (Last 7 days)
- Overall Auto-Approve Rate
- Average Confidence Score

**Agent Table:**
| Metric | Range | Target |
|--------|-------|--------|
| Decisions | 0-10,000+ | — |
| Confidence | 0-100 | 75-90 |
| Auto-Approve % | 0-100 | 75-85 |
| Accuracy % | 0-100 | 90%+ |
| Risk Distribution | L/M/H/C | Balanced |

**Time Periods:**
- Last 7 days (default)
- Last 30 days
- Custom range

---

## API Endpoints

### Chat API (Intent Detection & Routing)

#### POST `/api/ai/chat`
Main chat dispatcher - detects intent and routes appropriately.

```
Request:
{
  messages: Array<{ role: "user" | "assistant"; content: string; }>;
  userId: string;
  context?: string;
}

Response:
{
  intent: string;                       // BOOKING_INQUIRY, URGENT_SERVICE, etc.
  nextAction: string;                   // SHOW_BOOKING_INFO, ROUTE_TO_AGENT, etc.
  response?: string;
}
```

**Intents Supported:**
- BOOKING_INQUIRY
- URGENT_SERVICE
- SWITCH_PROVIDER
- VENDOR_REQUEST
- RECURRING_SERVICE
- GET_QUOTE_ESTIMATE
- MODIFY_JOB
- ESCALATE_DISPUTE

---

#### POST `/api/ai/chat/booking-info`
Provides booking workflow information.

```
Request:
{ userMessage: string; }

Response:
{
  steps: string[];
  estimatedTime: string;
  faq: Array<{ q: string; a: string; }>;
}
```

---

#### POST `/api/ai/chat/vendor-request`
Sales agent for vendor inquiry routing.

```
Request:
{
  userMessage: string;
  userId: string;
  userEmail: string;
  vendorType: "sole_proprietor" | "small_team" | "agency" | "enterprise";
  inquiryType: "vendor_account" | "partnership" | "api_access" | "white_label";
}

Response:
{
  requestId: string;                    // TR-123456-ABC
  priority: "high" | "medium" | "standard";
  qualificationScore: number;
  recommendedPlan?: string;
  upsellOpportunities: string[];
}
```

---

### Agent APIs (Decision Endpoints)

All agent endpoints follow the same pattern:

```
POST /api/ai/agents/[agent-name]

Input: Agent-specific payload
Output: Decision with:
  - decision: main recommendation
  - confidence: 0-100 score
  - riskLevel: low/medium/high/critical
  - reasoning: human-readable explanation
```

**Agents:**
- `/api/ai/agents/support-agent`
- `/api/ai/agents/operations-manager`
- `/api/ai/agents/dispute-resolver`
- `/api/ai/agents/kyc-verifier`
- `/api/ai/agents/fraud-detector`
- `/api/ai/agents/booking-optimizer`
- `/api/ai/agents/escrow-manager`
- `/api/ai/agents/proactive-support`
- `/api/ai/agents/review-moderator`
- `/api/ai/agents/outreach-agent`

---

### Admin APIs

#### GET `/api/admin/approval-queue`
Retrieve pending decisions.

```
Query:
- status: pending_review (required)
- riskLevel: comma-separated (optional)
- agent: agent_name (optional)
- limit: 20 (default)
- skip: 0 (default)
- sort: riskLevel | confidence | createdAt

Response:
{
  decisions: IAIDecision[];
  total: number;
  stats: {
    byRisk: { low, medium, high, critical };
    byAgent: { agent_name: count };
  };
}
```

#### PATCH `/api/admin/approval-queue/[id]/approve`
Approve a decision.

```
Request:
{ notes: string; }

Response:
{ success: true; decision: IAIDecision; }
```

#### PATCH `/api/admin/approval-queue/[id]/reject`
Reject a decision.

```
Request:
{ reason: string; }

Response:
{ success: true; decision: IAIDecision; }
```

#### GET `/api/admin/ai-metrics`
Get agent metrics.

```
Query:
- agentName: specific agent (optional)
- period: 7 | 30 | 90 (default: 7)

Response:
{
  period: { startDate, endDate };
  summary: {
    totalDecisions: number;
    overallAutoApproveRate: number;
    averageConfidenceScore: number;
  };
  byAgent: Array<{
    agentName: string;
    totalDecisions: number;
    avgConfidenceScore: number;
    autoApproveRate: number;
    accuracy: number;
    overrideRate: number;
  }>;
}
```

---

## Database Schema

### AIDecision Collection

```typescript
{
  _id: ObjectId;
  
  // Core Decision Info
  type: "VALIDATION" | "DISPUTE" | "PAYOUT" | "SUPPORT" | "LEAD_SCORING" 
       | "KYC_VERIFICATION" | "FRAUD_CHECK" | "BOOKING_MATCH" 
       | "ESCROW_RELEASE" | "RISK_DETECTION" | "REVIEW_MODERATION" 
       | "OUTREACH_DECISION";
  agentName: "support_agent" | "operations_manager" | "dispute_resolver" 
           | "kyc_verifier" | "fraud_detector" | "sales_agent" 
           | "booking_optimizer" | "escrow_manager" | "proactive_support" 
           | "review_moderator" | "outreach_agent";
  status: "pending_review" | "approved" | "rejected" | "escalated";
  
  // Recommendation
  recommendation: string;
  confidenceScore: number;              // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  
  // Evidence
  supportingEvidence?: {
    fraudScore?: number;
    behavioralFlags?: string[];
    patternDetected?: string;
    photoEvidence?: string[];
    customerSentiment?: "positive" | "neutral" | "negative";
    sentimentScore?: number;
  };
  
  // Related Entity
  relatedEntityType?: "job" | "dispute" | "payout" | "ticket" | "lead";
  relatedEntityId?: ObjectId;
  
  // Resolution
  approvedBy?: ObjectId;                // User who approved
  rejectedBy?: ObjectId;                // User who rejected
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  escalatedReason?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
- { status: 1, createdAt: -1 }
- { agentName: 1, status: 1 }
- { riskLevel: 1, confidenceScore: 1 }
- { relatedEntityType: 1, relatedEntityId: 1 }
```

### AIFeedback Collection

```typescript
{
  _id: ObjectId;
  
  // Reference
  decisionId: ObjectId;                 // ref: AIDecision
  agentName: string;
  decisionType: string;
  
  // Feedback
  wasCorrect: boolean;                  // Did AI make right decision?
  userNotes?: string;
  userOverride?: boolean;               // Did human override AI?
  overrideReason?: string;
  
  // Outcome
  actualOutcome?: string;
  customerFeedback?: string;
  issueResolved: boolean;
  
  // Retraining Signal
  confidenceAccuracy?: {
    aiConfidence: number;
    wasCorrect: boolean;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
- { decisionId: 1 }
- { agentName: 1, wasCorrect: 1 }
- { userOverride: 1, createdAt: -1 }
```

---

## Integration Points

### How Agents Get Called

```
1. User Action
   └─> System Event Triggered
       └─> Agent Endpoint Called
           └─> AI Decision Generated
               └─> AIDecisionService.createDecision()
                   └─> Decision Saved to DB
                       └─> Approval Queue Updated
                           └─> Dashboard Refreshed
```

### Example: KYC Verification Flow

```
1. Provider uploads ID document
   └─> POST /api/ai/agents/kyc-verifier
       {
         providerId: "xyz";
         documents: { idDocument: "https://..." };
         userData: { name: "John", ... };
       }

2. Agent analyzes document
   └─> OpenAI API call
       └─> Returns KYCDecision
           {
             status: "approved";
             confidence: 95;
             credibilityScore: 92;
           }

3. Decision created & queued
   └─> AIDecisionService.createDecision({
         type: "KYC_VERIFICATION";
         agentName: "kyc_verifier";
         recommendation: "Provider verified";
         confidenceScore: 95;
         riskLevel: "low";
       })

4. Logged to AIDecision collection
   └─> Shows in approval-queue dashboard

5. Admin reviews
   └─> PATCH /api/admin/approval-queue/[id]/approve
       └─> AIDecisionService.approveDecision()
           └─> Decision status → "approved"

6. Feedback recorded
   └─> AIDecisionService.recordFeedback()
       └─> Saved to AIFeedback collection
           └─> Used for model fine-tuning
```

### Trigger Points by Agent

| Agent | Trigger | System Call |
|-------|---------|-------------|
| support_agent | New ticket created | Auto on ticket creation |
| operations_manager | Job posted | Auto on job submission |
| dispute_resolver | Dispute filed | Auto on dispute creation |
| kyc_verifier | Provider uploads ID | Manual or auto flow |
| fraud_detector | Payout requested | Auto before payout |
| sales_agent | Vendor inquiry received | Auto on vendor request |
| booking_optimizer | Job needs providers | Auto on booking |
| escrow_manager | Job marked complete | Auto after confirmation |
| proactive_support | Risk signals detected | Scheduled (hourly) |
| review_moderator | New review posted | Auto on review submission |
| outreach_agent | User inactive | Scheduled (daily) |

---

## Workflow Examples

### Workflow 1: Complete Support Ticket Resolution

```
┌─ Ticket Submitted (message: "App crashes on upload")
│
├─ POST /api/ai/agents/support-agent
│  Input: { message: "App crashes...", category: "technical_issue" }
│
├─ Agent Response: 
│  {
│    decision: {
│      responseType: "resolution",
│      shouldResolveDirectly: true,
│      confidence: 85
│    },
│    response: "Try clearing app cache: Settings > Storage > Clear Cache"
│  }
│
├─ AIDecisionService.createDecision()
│  Saves to AIDecision collection
│  Decision ID: "507f1f77bcf86cd799439011"
│
├─ Dashboard shows: "Support Decision Pending Review"
│  Priority: LOW (confidence 85%, response type resolution)
│
├─ Admin reviews after 2 hours
│  └─ PATCH /api/admin/approval-queue/507f1f77.../approve
│     { notes: "Good FAQ response" }
│
├─ Decision → approved
│  Ticket is auto-replied with suggested response
│
└─ AIDecisionService.recordFeedback()
   { wasCorrect: true, userOverride: false }
   → Used to improve support_agent accuracy
```

---

### Workflow 2: Fraud Detection & Blocking

```
┌─ Provider requests ₱50,000 payout
│  (unusual - normal average is ₱8,000)
│
├─ POST /api/ai/agents/fraud-detector
│  Input: {
│    type: "withdrawal",
│    amount: 50000,
│    userId: "provider_xyz",
│    userHistory: {
│      totalTransactions: 3,
│      averageTransactionAmount: 8000,
│      accountAgeInDays: 14,
│      previousFraudFlags: 0
│    }
│  }
│
├─ Agent Analysis:
│  Fraud Indicators:
│  - 6x average transaction
│  - Very new account (14 days)
│  - First large payout
│
├─ Agent Response:
│  {
│    riskScore: 78,
│    riskLevel: "high",
│    shouldBlock: true,
│    recommendedActions: [
│      "Hold for manual review",
│      "Request ID verification",
│      "Contact provider for confirmation"
│    ]
│  }
│
├─ AIDecisionService.createDecision()
│  Type: FRAUD_CHECK
│  Status: pending_review
│  Confidence: 85
│
├─ Dashboard Alert: "HIGH RISK - Fraud Detection"
│  Auto-queued for immediate review
│
├─ Admin reviews within 30 minutes
│  └─ Calls provider: "Need to verify your identity"
│     Provider provides additional documents
│
├─ Admin approves with notes
│  PATCH /api/admin/approval-queue/id/approve
│  { notes: "Provider verified via phone call" }
│
├─ Payout released after verification
│
└─ AIDecisionService.recordFeedback()
   { wasCorrect: true, userOverride: false }
   → False alarm probability decreases
```

---

### Workflow 3: Lead Scoring & Routing

```
┌─ Vendor Inquiry: "We want to scale our cleaning business nationwide"
│  Message body, email: "company@cleaningco.ph"
│  vendorType: "small_team"
│  inquiryType: "partnership"
│
├─ POST /api/ai/chat/vendor-request
│  Input: { ... }
│
├─ Sales Agent Analysis:
│  - Industry: Cleaning (established category)
│  - Type: Small team (12-50 staff)
│  - Inquiry: Partnership (not just vendor account)
│  - Motivation: Nationwide scaling
│
├─ Agent Scoring:
│  {
│    priority: "high",
│    qualificationScore: 78,
│    recommendedPlan: "Pro",
│    upsellOpportunities: [
│      "Multi-location management",
│      "Team training program",
│      "White-label franchise model"
│    ]
│  }
│
├─ AIDecisionService.createDecision()
│  Type: LEAD_SCORING
│  ConfidenceScore: 78
│  RiskLevel: low
│
├─ Approval Queue:
│  Shows in "Sales Partnership" queue
│  Priority: HIGH (78 score)
│
├─ Sales team reviews within 4 hours
│  └─ PATCH /api/admin/approval-queue/id/approve
│     { notes: "Assigned to Senior Partnership Manager" }
│
├─ Sales Manager schedules 30-min discovery call
│  - Agenda auto-generated by agent:
│    1. Current operations & team size
│    2. Geographic expansion plans
│    3. Training & support needs
│    4. Revenue sharing expectations
│    5. Integration requirements
│
└─ Potential contract value: ₱2.4M/year
   (12 locations × ₱200K avg monthly revenue)
```

---

## Testing

### Unit Testing

```bash
# Test individual agents
pnpm test src/app/api/ai/agents/kyc-verifier.test.ts

# Test decision service
pnpm test src/services/ai-decision.service.test.ts

# Test approval queue
pnpm test src/app/(dashboard)/admin/approval-queue/
```

### Integration Testing

```bash
# Full Phase 1-2 flow
pnpm test src/app/api/ai/chat/__tests__/phase1.test.ts
pnpm test src/app/api/ai/chat/__tests__/phase2.test.ts

# Vendor request handler
pnpm test src/app/api/ai/chat/vendor-request/vendor-request.test.ts

# Full end-to-end scenarios
bash run_phase2_qa_tests.sh
```

### Manual Testing

```bash
# Start dev server
pnpm dev

# Test support agent
curl -X POST http://localhost:3000/api/ai/agents/support-agent \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "test-123",
    "message": "App crashes",
    "category": "technical_issue"
  }'

# Check approval queue
curl http://localhost:3000/admin/approval-queue

# Check metrics
curl http://localhost:3000/admin/ai-metrics
```

---

## Monitoring & Metrics

### Key Performance Indicators

#### Per-Agent Metrics
- **Total Decisions:** Cumulative decisions made by agent
- **Confidence Score:** Average confidence (target: 75-90)
- **Auto-Approve Rate:** % decisions approved without override (target: 75-85%)
- **Accuracy Rate:** % of approved decisions that were correct (target: 90%+)
- **Override Rate:** % decisions overridden by humans (target: <10%)
- **Response Time:** Avg time to make decision (target: <2s)

#### System Metrics
- **Queue Size:** Pending decisions waiting for review
- **Review Velocity:** Decisions reviewed per hour
- **Processing Time:** Avg time from creation to resolution
- **Error Rate:** % of decisions with errors

### Monitoring Dashboard

**Location:** `/admin/ai-metrics`

**Displays:**
- Summary cards (total decisions, auto-approve rate, avg confidence)
- Per-agent table with all metrics
- Time-series graphs
- Risk distribution charts

### Alerts & Escalation

**Auto-Triggered:**
- Queue size > 100: Notify review team
- Confidence score drops below 70%: Flag agent for retraining
- Error rate > 2%: Disable agent until investigated
- High-risk decisions: Immediate escalation

### Feedback Loop

```
1. Decision approved/rejected
2. Admin provides feedback/notes
3. Feedback recorded in AIFeedback collection
4. System tracks pattern of corrections
5. Agent performance updated
6. If accuracy drops: Schedule retraining
7. If improves: Increase auto-approve rate
```

---

## Operational Runbook

### Daily Tasks

**Morning (8 AM):**
1. Check approval queue dashboard
2. Review overnight decisions
3. Process urgent high-risk items
4. Check error logs

**Throughout Day:**
1. Process approval queue (target: 95% cleared daily)
2. Monitor metrics dashboard
3. Record feedback on decisions

**Evening (5 PM):**
1. Generate daily report
2. Archive processed decisions
3. Check for any escalations

### Weekly Tasks

**Monday:**
1. Review weekly metrics summary
2. Compare agent performance trends
3. Identify agents for potential improvement

**Thursday:**
1. Review retraining needs
2. Check customer feedback on AI decisions
3. Plan any adjustments

---

## Deployment Status

### Current Status (April 21, 2026)

✅ **Deployed:**
- 11 AI agents (all phases)
- Approval queue system
- Metrics dashboard
- Feedback system
- All admin dashboards

✅ **Tested:**
- Phase 1-2 chat dispatcher
- Phase 2 vendor request handler
- All agent endpoints
- Database schema updates
- Type safety fixes

✅ **Integrated:**
- Chat dispatcher
- Decision service
- Approval workflows
- Notification system

**Next Steps:**
- Monitor production metrics (first 7 days)
- Gather admin feedback
- Fine-tune auto-approve thresholds
- Plan Phase 8-10 expansions

---

## Support & Troubleshooting

### Common Issues

**Queue not updating:**
- Check MongoDB connection
- Verify API key permissions
- Check browser cache (F5 refresh)

**Agent returning errors:**
- Check OpenAI API key
- Verify input schema matches
- Check agent logs: `docker logs localpro-api`

**Metrics not showing:**
- Ensure decisions are being created
- Check AIFeedback collection for records
- Verify `/api/admin/ai-metrics` endpoint

### Getting Help

- **Agent Issues:** Check agent logs + OpenAI API dashboard
- **Database Issues:** Check MongoDB connection string
- **Dashboard Issues:** Check browser console (F12)
- **Performance Issues:** Check AI Decision Service metrics

---

## Architecture Decisions

### Why This Design?

1. **Async Processing:** Decisions queued for human review = lower risk of AI errors + training signal from overrides

2. **Modular Agents:** Each agent independent = easy to test, deploy, disable individually

3. **Type-Safe:** Full TypeScript = catch errors at compile time + auto-documentation

4. **Observable:** Every decision tracked = can audit, debug, and improve

5. **Scalable:** Stateless agents = can horizontal scale + use multiple instances

---

## Glossary

| Term | Definition |
|------|-----------|
| **Agent** | AI system making specific decisions (e.g., KYC Verifier) |
| **Decision** | Output from an agent (e.g., "Provider approved") |
| **Confidence Score** | Agent's confidence in decision (0-100) |
| **Risk Level** | Severity of decision (low/medium/high/critical) |
| **Auto-Approve** | Decision implemented without human review |
| **Override** | Human rejected agent's recommendation |
| **Feedback** | Human's assessment of whether agent was correct |
| **Decision Type** | Category of decision (KYC_VERIFICATION, etc.) |
| **Approval Queue** | Dashboard showing pending decisions for review |
| **Metrics** | Agent performance statistics |

---

**Document Version:** 1.0  
**Last Updated:** April 21, 2026  
**Maintained By:** AI Platform Team
