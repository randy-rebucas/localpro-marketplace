# AI Automation - Quick Reference Guide
**Updated:** April 21, 2026 | **Status:** ✅ 11 Agents Active

---

## Agent Quick Reference

| # | Agent | Purpose | Endpoint | Decision Type | Auto-Approve Rate |
|---|-------|---------|----------|---------------|-------------------|
| 1 | Support Agent | Ticket triage | `/api/ai/agents/support-agent` | SUPPORT | 85% |
| 2 | Operations Manager | Job validation | `/api/ai/agents/operations-manager` | VALIDATION | 80% |
| 3 | Dispute Resolver | Dispute resolution | `/api/ai/agents/dispute-resolver` | DISPUTE | 70% |
| 4 | KYC Verifier | Identity verification | `/api/ai/agents/kyc-verifier` | KYC_VERIFICATION | 75% |
| 5 | Fraud Detector | Fraud detection | `/api/ai/agents/fraud-detector` | FRAUD_CHECK | 90% |
| 6 | Sales Agent | Lead qualification | `/api/ai/chat/vendor-request` | LEAD_SCORING | 85% |
| 7 | Booking Optimizer | Provider matching | `/api/ai/agents/booking-optimizer` | BOOKING_MATCH | 80% |
| 8 | Escrow Manager | Escrow release | `/api/ai/agents/escrow-manager` | ESCROW_RELEASE | 90% |
| 9 | Proactive Support | Risk detection | `/api/ai/agents/proactive-support` | RISK_DETECTION | 75% |
| 10 | Review Moderator | Review moderation | `/api/ai/agents/review-moderator` | REVIEW_MODERATION | 95% |
| 11 | Outreach Agent | Churn prevention | `/api/ai/agents/outreach-agent` | OUTREACH_DECISION | 60% |

---

## Common API Calls

### Test an Agent

```bash
# KYC Verifier (most straightforward)
curl -X POST http://localhost:3000/api/ai/agents/kyc-verifier \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "test-provider-1",
    "documents": {
      "idDocument": "https://example.com/id.jpg"
    },
    "userData": {
      "name": "John Doe",
      "phone": "+63912345678",
      "email": "john@example.com",
      "yearsInBusiness": 5,
      "previousJobs": 50
    }
  }'
```

### Check Approval Queue

```bash
# Get pending decisions
curl "http://localhost:3000/api/admin/approval-queue?status=pending_review&limit=10"
```

### Get Metrics

```bash
# Get all agent metrics
curl http://localhost:3000/api/admin/ai-metrics

# Get specific agent
curl "http://localhost:3000/api/admin/ai-metrics?agentName=kyc_verifier"
```

### Approve a Decision

```bash
# Approve with curl
curl -X PATCH http://localhost:3000/api/admin/approval-queue/[DECISION_ID]/approve \
  -H "Content-Type: application/json" \
  -d '{"notes": "Verified and approved"}'
```

### Reject a Decision

```bash
# Reject with curl
curl -X PATCH http://localhost:3000/api/admin/approval-queue/[DECISION_ID]/reject \
  -H "Content-Type: application/json" \
  -d '{"reason": "Document is unclear"}'
```

---

## Dashboard URLs

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Approval Queue | `/admin/approval-queue` | Review pending decisions |
| AI Metrics | `/admin/ai-metrics` | View agent performance |
| AI Performance | `/admin/ai-performance` | Detailed analytics |

---

## Database Collections

```javascript
// AIDecision collection - decisions pending/approved/rejected
db.aidecisions.find({ status: "pending_review" }).count()

// AIFeedback collection - human feedback for training
db.aifeedbacks.find({ wasCorrect: true }).count()

// View queue by risk level
db.aidecisions.aggregate([
  { $match: { status: "pending_review" } },
  { $group: { _id: "$riskLevel", count: { $sum: 1 } } }
])
```

---

## Common Queries

### Agents by Performance

```typescript
// Get top-performing agent
const metrics = await AIDecisionService.getAgentAccuracyMetrics();
metrics.sort((a, b) => b.accuracyRate - a.accuracyRate);

// Get most decisions made
const metrics = await AIDecisionService.getAgentAccuracyMetrics();
metrics.sort((a, b) => b.totalDecisions - a.totalDecisions);
```

### Find High-Risk Pending Decisions

```bash
# Get all critical decisions pending
curl "http://localhost:3000/api/admin/approval-queue?status=pending_review&riskLevel=critical"
```

### Check Agent Accuracy

```typescript
const kyc = await AIDecisionService.getAgentAccuracyMetrics("kyc_verifier");
console.log(`KYC Accuracy: ${kyc.accuracyRate}%`);
console.log(`Total Decisions: ${kyc.totalDecisions}`);
console.log(`Correct: ${kyc.correctDecisions}`);
```

---

## Troubleshooting

### Queue Not Showing Decisions
1. Check if agents are being called: `db.aidecisions.count()`
2. Check MongoDB connection: `mongosh mongodb://localhost:27017`
3. Check for errors: Look at server logs
4. Refresh dashboard: Hard refresh (Ctrl+Shift+R)

### Agent Returns 500 Error
1. Check OpenAI API key: `echo $OPENAI_API_KEY`
2. Check API account has credits
3. Check request schema matches agent input type
4. Check MongoDB connection

### Metrics Show "No Data"
1. Create test decision first
2. Wait 5 seconds for indexing
3. Check database has records: `db.aidecisions.count()`
4. Check time period (default last 7 days)

### Decision Not Moving After Approval
1. Check approval endpoint called successfully
2. Check decision status changed to "approved"
3. Check error logs for webhook failures
4. Manually verify in database

---

## Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Agent Response Time | <2 seconds | ~1.2s | ✅ |
| Dashboard Load | <500ms | ~400ms | ✅ |
| Auto-Approve Rate | 75-85% | ~80% | ✅ |
| Override Rate | <10% | ~8% | ✅ |
| Overall Accuracy | 90%+ | ~91% | ✅ |
| Daily Decisions | 500+ | ~800 | ✅ |

---

## Access Control

### Required Permissions

```typescript
// To access approval queue
requireCapability(user, "manage_operations");

// To access metrics
requireCapability(user, "manage_operations");

// To create decisions
requireUser();  // Any authenticated user

// To approve/reject
requireCapability(user, "manage_operations");
```

---

## Alert Thresholds

| Alert | Threshold | Action |
|-------|-----------|--------|
| Queue Size | >100 | Page on-call reviewer |
| Agent Accuracy | <85% | Flag for retraining |
| Error Rate | >2% | Disable agent |
| Response Time | >3s | Investigate performance |
| Confidence Drop | <70 avg | Manual review mode |

---

## Testing Scripts

```bash
# Run all AI tests
pnpm test src/app/api/ai/

# Run Phase 2 tests specifically
pnpm test src/app/api/ai/chat/__tests__/phase2.test.ts

# Run approval queue tests
pnpm test src/app/api/admin/approval-queue/

# Run full integration tests
bash run_phase2_qa_tests.sh

# Run remaining QA tests
bash run_phase2_remaining_qa.sh
```

---

## File Organization

```
src/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── agents/           ← 10 agent endpoints
│   │   │   ├── chat/             ← Chat dispatcher + vendor request
│   │   │   └── suggest-*/        ← Helper endpoints
│   │   └── admin/
│   │       ├── approval-queue/   ← Queue API
│   │       └── ai-metrics/       ← Metrics API
│   └── (dashboard)/
│       └── admin/
│           ├── approval-queue/   ← Queue dashboard
│           └── ai-metrics/       ← Metrics dashboard
├── models/
│   ├── AIDecision.ts             ← Decision schema
│   └── AIFeedback.ts             ← Feedback schema
├── services/
│   └── ai-decision.service.ts    ← Core service logic
└── components/
    └── admin/
        ├── AIApprovalDashboard.tsx
        ├── AIMetricsDisplay.tsx
        └── AIPerformanceMetrics.tsx
```

---

## Type Definitions

### All Agent Names
```typescript
type AIAgentName =
  | "support_agent"
  | "operations_manager"
  | "dispute_resolver"
  | "kyc_verifier"
  | "fraud_detector"
  | "sales_agent"
  | "booking_optimizer"
  | "escrow_manager"
  | "proactive_support"
  | "review_moderator"
  | "outreach_agent";
```

### All Decision Types
```typescript
type AIDecisionType =
  | "VALIDATION"           // operations_manager
  | "DISPUTE"              // dispute_resolver
  | "PAYOUT"               // legacy
  | "SUPPORT"              // support_agent
  | "LEAD_SCORING"         // sales_agent
  | "KYC_VERIFICATION"     // kyc_verifier
  | "FRAUD_CHECK"          // fraud_detector
  | "BOOKING_MATCH"        // booking_optimizer
  | "ESCROW_RELEASE"       // escrow_manager
  | "RISK_DETECTION"       // proactive_support
  | "REVIEW_MODERATION"    // review_moderator
  | "OUTREACH_DECISION";   // outreach_agent
```

### All Risk Levels
```typescript
type AIRiskLevel = "low" | "medium" | "high" | "critical";
```

### All Decision Statuses
```typescript
type AIDecisionStatus = 
  | "pending_review"
  | "approved"
  | "rejected"
  | "escalated";
```

---

## Key Links

- **Full Documentation:** [AI_AUTOMATION_COMPLETE_DOCUMENTATION.md](AI_AUTOMATION_COMPLETE_DOCUMENTATION.md)
- **Audit Report:** [AI_METRICS_FULL_AUDIT.md](AI_METRICS_FULL_AUDIT.md)
- **Agents Registry:** [AGENTS.md](AGENTS.md)
- **E2E Testing Plan:** [E2E_TESTING_PLAN.md](E2E_TESTING_PLAN.md)
- **Quick Start:** [QUICK_START.md](QUICK_START.md)

---

## Contact & Support

- **AI Platform Team:** @ai-team (Slack)
- **On-Call:** Check schedule in #oncall
- **Issues:** Create ticket in Jira under AI-AUTOMATION
- **Questions:** Ask in #ai-platform-dev

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| Apr 21, 2026 | 1.0 | Initial 11 agents deployed |
| Apr 15, 2026 | 0.9 | Sales agent & metrics added |
| Apr 10, 2026 | 0.8 | KYC & Fraud agents added |
| Apr 5, 2026 | 0.7 | Approval queue system added |
| Mar 28, 2026 | 0.5 | Core 3 agents deployed |

---

**Quick Links:**
- [Test Agent](#test-an-agent)
- [Check Queue](#check-approval-queue)
- [Get Metrics](#get-metrics)
- [Troubleshoot](#troubleshooting)
- [Dashboards](#dashboard-urls)
