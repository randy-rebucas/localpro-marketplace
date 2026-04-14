# AI Chat Dispatcher - QA Testing Quick Guide

## Quick Test Commands

### 1. Test Intent Detection via cURL

**Test RECURRING_SERVICE:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "I need a cleaner to come by weekly on Sundays"}],
    "context": "User testing recurring service"
  }'
```

**Expected Response:** Intent = "RECURRING_SERVICE", frequency = "weekly"

---

**Test GET_QUOTE_ESTIMATE:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "How much would it cost for electrical work in Manila?"}],
    "context": "Price estimate test"
  }'
```

**Expected Response:** Intent = "GET_QUOTE_ESTIMATE", nextAction = "SHOW_PRICE_ESTIMATE"

---

**Test MODIFY_JOB:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Can we reschedule to tomorrow at 3pm instead?"}],
    "context": "Job modification test"
  }'
```

**Expected Response:** Intent = "MODIFY_JOB", newTime = "15:00"

---

**Test ESCALATE_DISPUTE:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Im very unhappy with the work quality. The plumber did a poor job and I want a refund."}],
    "context": "Dispute escalation test"
  }'
```

**Expected Response:** Intent = "ESCALATE_DISPUTE", severity = "high" or "medium"

---

### 2. Test API Endpoints Directly

**Recurring Job Search:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/recurring-job \
  -H "Content-Type: application/json" \
  -d '{
    "jobData": {
      "category": "cleaning",
      "frequency": "weekly",
      "location": "Quezon City",
      "budgetMin": 1000,
      "budgetMax": 3000
    }
  }'
```

**Expected:** 200 OK with providers array

---

**Price Estimate:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/price-estimate \
  -H "Content-Type: application/json" \
  -d '{
    "jobData": {
      "category": "electrical",
      "location": "Manila",
      "budgetMin": 2000,
      "budgetMax": 8000
    }
  }'
```

**Expected:** 200 OK with estimate object

---

### 3. Frontend Testing Checklist

**Login & Setup:**
- [ ] Log in to LocalPro marketplace
- [ ] Navigate to any page with chat dispatcher

**Test Recurring Service:**
- [ ] Open chat
- [ ] Type: "I need a cleaner weekly"
- [ ] Verify: Intent shows RECURRING_SERVICE
- [ ] Verify: Provider list appears
- [ ] Verify: Can select provider

**Test Price Estimate:**
- [ ] Type: "How much for painting?"
- [ ] Verify: Price range shown
- [ ] Verify: Market comparison displayed
- [ ] Verify: "Search providers" link works

**Test Job Modification:**
- [ ] Type: "Can we reschedule to tomorrow?"
- [ ] Verify: Intent recognized as MODIFY_JOB
- [ ] Verify: Success message shows changes
- [ ] Verify: Provider was notified (check notifications)

**Test Dispute Escalation:**
- [ ] Type: "The work quality is poor"
- [ ] Verify: Intent recognized as ESCALATE_DISPUTE
- [ ] Verify: Dispute ID generated
- [ ] Verify: Status shows "disputed"

---

## Key Validation Points

### Intent Extraction Engine

| Intent | Keywords to Detect | Should NOT Detect | Confidence Level |
|--------|-------------------|-------------------|------------------|
| RECURRING_SERVICE | weekly, monthly, bi-weekly, every, regular, recurring | one-time, once, today | 95%+ |
| GET_QUOTE_ESTIMATE | price, cost, budget, how much, expensive, affordable | booking, appointment | 90%+ |
| MODIFY_JOB | reschedule, change, tomorrow, postpone, move | cancel, delete | 85%+ |
| ESCALATE_DISPUTE | poor quality, overcharge, refund, safety, bad | just asking | 85%+ |

### API Response Validation

**Recurring Job Endpoint:**
```json
{
  "message": "Found X providers...",
  "providers": [
    {
      "providerId": "...",
      "name": "...",
      "rating": 4.5,
      "matchScore": 95,
      "offerRecurring": true
    }
  ],
  "nextAction": "SELECT_RECURRING_PROVIDER"
}
```

**Price Estimate Endpoint:**
```json
{
  "message": "Based on X jobs...",
  "estimate": {
    "estimatedPrice": { "min": 2000, "max": 8000, "average": 5000 },
    "marketAverage": { "min": 2000, "max": 8000 },
    "currency": "PHP",
    "sampleSize": 24
  },
  "nextAction": "SEARCH_PROVIDERS"
}
```

**Job Modification Endpoint:**
```json
{
  "message": "Job updated successfully...",
  "job": {
    "id": "...",
    "status": "assigned",
    "scheduledDate": "...",
    "scheduledTime": "15:00"
  },
  "changes": ["Rescheduled from...", "Updated time to..."],
  "nextAction": "MODIFICATION_COMPLETE"
}
```

**Dispute Escalation Endpoint:**
```json
{
  "message": "Your dispute has been escalated...",
  "disputeId": "ESC-abc123",
  "jobStatus": "disputed",
  "nextAction": "DISPUTE_ESCALATED"
}
```

---

## Known Issues & Workarounds

| Issue | Impact | Workaround | Status |
|-------|--------|-----------|--------|
| Provider search may return no results | Low | Falls back to category defaults | ✅ Handled |
| Auth errors on protected endpoints | Medium | Ensure user is logged in | ✅ Expected |
| OpenAI API rate limits | Medium | Returns 429, retry after header | ⚠️ Monitor |
| Database queries slow at scale | Low | Optimization in Q3 | 🔄 Planned |

---

## Performance Baselines

**Target Response Times:**
- Intent extraction: < 2 seconds
- Provider search: < 1 second
- Price estimate: < 500ms
- Job modification: < 1 second
- Dispute escalation: < 1 second

**Monitor these metrics:**
- OpenAI API latency (should be < 1.5s)
- Database query time (should be < 100ms per query)
- Network roundtrip time (vary by region)

---

## Regression Test Matrix

| Scenario | Phase 0 (Still Works?) | Expected | Status |
|----------|------------------------|----------|--------|
| Basic job posting | ✅ Must pass | ✅ | ? |
| Provider search (non-recurring) | ✅ Must pass | ✅ | ? |
| Job status check | ✅ Must pass | ✅ | ? |
| Job cancellation | ✅ Must pass | ✅ | ? |
| Booking confirmation | ✅ Must pass | ✅ | ? |
| General Q&A | ✅ Must pass | ✅ | ? |

---

## Sign-Off Template

**Test Date:** ___________  
**Tester Name:** ___________  
**Environment:** ☐ Local ☐ Staging ☐ Production  

**Results:**
- RECURRING_SERVICE: ☐ Pass ☐ Fail ☐ Partial
- GET_QUOTE_ESTIMATE: ☐ Pass ☐ Fail ☐ Partial
- MODIFY_JOB: ☐ Pass ☐ Fail ☐ Partial
- ESCALATE_DISPUTE: ☐ Pass ☐ Fail ☐ Partial

**Issues Found:**
- [ ] List issues here

**Approval:** ____________________  
**Date:** ___________

---

## Next Steps After Testing

✅ If all pass:
1. Mark Phase 1 as complete
2. Begin Phase 2 implementation (4 more intents)
3. Plan performance optimization

⚠️ If issues found:
1. Document in issue tracker
2. Prioritize by severity
3. Create fixes and re-test
4. Update regression matrix

❌ If critical failures:
1. Stop Phase 2 planning
2. Debug root cause
3. Fix implementation
4. Full re-test cycle
