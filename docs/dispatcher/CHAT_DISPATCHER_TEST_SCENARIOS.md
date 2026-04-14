# Phase 1 Testing Scenarios

## Overview
This document provides end-to-end testing scenarios for Phase 1 implementation of the AI Chat Dispatcher (RECURRING_SERVICE, GET_QUOTE_ESTIMATE, MODIFY_JOB, ESCALATE_DISPUTE).

---

## Scenario 1: RECURRING_SERVICE Intent

### Test Case 1a: Weekly Cleaning Service
**User Input:** "I need a cleaner to come by every week on Sundays"

**Expected System Behavior:**
1. ✅ Intent extracted: `RECURRING_SERVICE`
2. ✅ Data captured:
   - category: "cleaning"
   - frequency: "weekly"
   - scheduledDay: "Sunday" (or dayOfWeek: 0)
3. ✅ Next Action: `SHOW_RECURRING_OPTIONS`
4. ✅ Response: "Great! I found recurring cleaning providers for you. Let me show the best weekly matches..."
5. ✅ API Call: `/api/ai/chat/recurring-job`
6. ✅ Provider Results: Returns top 5 recurring-enabled cleaners

**Validation Checklist:**
- [ ] Intent classification correct
- [ ] Frequency properly extracted
- [ ] API endpoint returns providers with `offerRecurring: true`
- [ ] Match scores calculated correctly
- [ ] UI shows provider cards with rating/jobs/matchScore
- [ ] User can select provider to proceed

**Test Implementation:**
```typescript
const input = "I need a cleaner to come by every week on Sundays";
const expectedIntent = "RECURRING_SERVICE";
const expectedFrequency = "weekly";
```

---

### Test Case 1b: Monthly Service with Budget
**User Input:** "Can I get a handyman once a month for maintenance? My budget is 2000-3000 pesos"

**Expected System Behavior:**
1. ✅ Intent extracted: `RECURRING_SERVICE`
2. ✅ Data captured:
   - category: "general_handyman"
   - frequency: "monthly"
   - budgetMin: 2000
   - budgetMax: 3000
3. ✅ Recurring API call includes budget constraints
4. ✅ Providers filtered by budget availability

**Validation Checklist:**
- [ ] Budget range extracted correctly
- [ ] Recurring API respects budget constraints
- [ ] Providers returned are within budget + have recurring availability
- [ ] Conversion handles "pesos" currency mention

---

### Test Case 1c: Ambiguous Frequency (Clarification)
**User Input:** "I need someone to do yard work regularly"

**Expected System Behavior:**
1. ✅ Intent extracted: `RECURRING_SERVICE` (with low confidence)
2. ✅ Next Action: `ASK_QUESTION`
3. ✅ Clarifying Questions:
   - "How often would you like them to come? (weekly, bi-weekly, monthly?)"
   - "What's your budget per visit?"
   - "What specific yard work do you need?"

**Validation Checklist:**
- [ ] System recognizes ambiguity
- [ ] Generates relevant clarifying questions
- [ ] User can answer in follow-up message
- [ ] System extracts details from response

---

## Scenario 2: GET_QUOTE_ESTIMATE Intent

### Test Case 2a: Simple Price Query
**User Input:** "How much would it cost for electrical work in Manila?"

**Expected System Behavior:**
1. ✅ Intent extracted: `GET_QUOTE_ESTIMATE`
2. ✅ Data captured:
   - category: "electrical"
   - location: "Manila"
3. ✅ Next Action: `SHOW_PRICE_ESTIMATE`
4. ✅ API Call: `/api/ai/chat/price-estimate`
5. ✅ Response Format:
   ```
   Based on X recent electrical jobs in Manila, I'd estimate 
   ₱2,000 - ₱8,000 (average ₱5,000).
   
   Would you like to search for available providers at your budget?
   ```

**Validation Checklist:**
- [ ] Category correctly identified
- [ ] Location extracted
- [ ] Price ranges calculated from recent jobs
- [ ] Currency (PHP) properly formatted
- [ ] If no historical data, falls back to category defaults
- [ ] Sample size reported (helps user confidence)

**Test Implementation:**
```typescript
const priceData = {
  minPrice: 2000,
  maxPrice: 8000,
  averagePrice: 5000,
  sampleSize: 24,
};
// Verify response contains this data
```

---

### Test Case 2b: Query with Custom Budget
**User Input:** "What's the typical price for roof repair in Cebu? I can spend up to 20,000 pesos"

**Expected System Behavior:**
1. ✅ Intent: `GET_QUOTE_ESTIMATE`
2. ✅ Extracted:
   - category: "roof_repair"
   - location: "Cebu"
   - budgetMax: 20000
3. ✅ Price estimate respects user's budget ceiling
4. ✅ Response: "Based on recent data, roof repairs typically range from ₱8,000 - ₱18,000, which fits well within your ₱20,000 budget."

**Validation Checklist:**
- [ ] Budget constraint recognized
- [ ] Estimate tailored to user's budget
- [ ] Response acknowledges budget fit
- [ ] Doesn't recommend providers above budget

---

### Test Case 2c: Generic Category (Default Pricing)
**User Input:** "I need some carpentry work done. How much should I budget?"

**Expected System Behavior:**
1. ✅ Intent: `GET_QUOTE_ESTIMATE`
2. ✅ No historical data found (scenario may have few carpentry jobs)
3. ✅ Falls back to category default pricing
4. ✅ Response: "For carpentry work, typical costs range from ₱2,500 - ₱8,000 depending on complexity."
5. ✅ Acknowledges estimate source: "Based on market averages"

**Validation Checklist:**
- [ ] Falls back gracefully when no data
- [ ] Category defaults are reasonable
- [ ] Response indicates data source
- [ ] Still provides useful guidance

---

## Scenario 3: MODIFY_JOB Intent

### Test Case 3a: Reschedule to Tomorrow
**User Input:** "Can we reschedule my appointment to tomorrow instead? Preferably at 3pm"

**Precondition:** User has active job with jobId

**Expected System Behavior:**
1. ✅ Intent extracted: `MODIFY_JOB`
2. ✅ Data captured:
   - newDate: [tomorrow's date]
   - newTime: "15:00" or "3pm"
   - scopeChange: none
3. ✅ Next Action: `MODIFY_JOB_CONFIRM`
4. ✅ Response: "Let me update your job details..."
5. ✅ API Call: `/api/ai/chat/modify-job`
6. ✅ Validation:
   - Job status is modifiable (not completed/cancelled)
   - New date is in future
   - Provider is notified if assigned
7. ✅ Success Response:
   ```
   Job updated successfully. 
   Changes: Rescheduled from [old date] to [new date], Updated time to 3pm.
   The provider has been notified.
   ```

**Validation Checklist:**
- [ ] Date/time extracted correctly
- [ ] Validated against past date
- [ ] Job status allows modification
- [ ] Provider notification sent
- [ ] Modification history logged
- [ ] Success response includes changes list

---

### Test Case 3b: Change Scope (Reduce)
**User Input:** "Actually, we don't need the exterior painted, just the interior"

**Expected System Behavior:**
1. ✅ Intent: `MODIFY_JOB`
2. ✅ Extracted:
   - scopeChange: "reduce"
3. ✅ Response: "Updating your job scope..."
4. ✅ Provider notified: "Scope of work has been reduced"
5. ✅ Changes recorded with timestamp

**Validation Checklist:**
- [ ] Scope change type identified (add/remove/reduce)
- [ ] Provider notified of scope changes
- [ ] Job status updated if needed
- [ ] Modification logged

---

### Test Case 3c: Cannot Modify Completed Job
**User Input:** "I want to reschedule my plumbing job to next week"

**Scenario:** Job status is "completed"

**Expected System Behavior:**
1. ✅ Intent: `MODIFY_JOB`
2. ✅ Validation fails: Job status is "completed"
3. ✅ Response: "Cannot modify job with status: completed"
4. ✅ Status code: 400

**Validation Checklist:**
- [ ] System checks modifiable statuses
- [ ] Rejects modification of completed jobs
- [ ] Error message is clear
- [ ] No partial updates

---

## Scenario 4: ESCALATE_DISPUTE Intent

### Test Case 4a: Quality Issue Escalation
**User Input:** "I'm very unhappy with the work quality. The plumber did a poor job and I want a refund."

**Precondition:** User has completed job with quality issues

**Expected System Behavior:**
1. ✅ Intent extracted: `ESCALATE_DISPUTE`
2. ✅ Data captured:
   - disputeReason: "poor quality work"
   - disputeSeverity: "medium" or "high"
3. ✅ Next Action: `ESCALATE_DISPUTE`
4. ✅ Response: "I'm escalating this to our support team for resolution..."
5. ✅ API Call: `/api/ai/chat/escalate-dispute`
6. ✅ System Actions:
   - Job status set to "disputed"
   - Dispute record created
   - Support team notified
   - Provider notified
7. ✅ Success Response:
   ```
   Your dispute has been escalated to our support team. 
   A support specialist will contact you within 24 hours.
   
   Dispute ID: ESC-[jobId suffix]
   Severity: high
   
   Track status in your dashboard.
   ```

**Validation Checklist:**
- [ ] Dispute reason extracted
- [ ] Severity level determined (low/medium/high)
- [ ] Job status changed to "disputed"
- [ ] Dispute ID generated
- [ ] Support team notified with details
- [ ] Provider notified (can respond to dispute)
- [ ] User given tracking ID
- [ ] Can't escalate non-existent job

---

### Test Case 4b: Overcharge Dispute
**User Input:** "The provider charged me ₱10,000 but we agreed on ₱5,000. This is an overcharge!"

**Expected System Behavior:**
1. ✅ Intent: `ESCALATE_DISPUTE`
2. ✅ Extracted:
   - disputeReason: "overcharge"
   - disputeSeverity: "high"
3. ✅ Severity auto-escalated to "high" (financial issue)
4. ✅ Support team flagged for priority review

**Validation Checklist:**
- [ ] Overcharge keywords detected
- [ ] Severity automatically raised
- [ ] Amount mentioned detected (if parseable)
- [ ] Priority routing to support

---

### Test Case 4c: Safety Concern
**User Input:** "I have serious safety concerns about this work. The electrical installation looks dangerous."

**Expected System Behavior:**
1. ✅ Intent: `ESCALATE_DISPUTE`
2. ✅ Severity: "high" (safety issue)
3. ✅ Support team flagged for urgent response
4. ✅ May trigger additional safety checks

**Validation Checklist:**
- [ ] Safety keywords trigger high severity
- [ ] Urgent routing enabled
- [ ] Support team has context

---

## Scenario 5: Multi-Intent Conversation Flow

### Test Case 5a: Price → Search → Recurring
**Conversation Flow:**
1. User: "How much does cleaning usually cost in Quezon City?"
   - Intent: `GET_QUOTE_ESTIMATE`
   - Response: Price range provided
2. User: "Sounds good, can I find someone who can do it weekly?"
   - Intent: `RECURRING_SERVICE` (context: cleaning, QC)
   - Response: Weekly cleaners shown
3. User: "Great, let's go with Maria's Cleaning Services"
   - Intent: `CONFIRM_BOOKING`
   - Response: Booking confirmed

**Validation Checklist:**
- [ ] Intent context preserved across turns
- [ ] Category/location carry over
- [ ] Response flow is natural
- [ ] State management works

---

## Scenario 6: Error Handling

### Test Case 6a: Missing Authentication
**Request:** POST `/api/ai/chat/modify-job` without auth token

**Expected:**
- Status: 401 Unauthorized
- Response: `{ error: "Unauthorized" }`

**Validation Checklist:**
- [ ] All protected endpoints check auth
- [ ] Clear error message
- [ ] No partial data leakage

---

### Test Case 6b: Invalid Job ID
**Request:** POST `/api/ai/chat/modify-job` with non-existent jobId

**Expected:**
- Status: 404 Not Found
- Response: `{ error: "Job not found" }`

**Validation Checklist:**
- [ ] Job existence verified
- [ ] Proper error code
- [ ] No data leaked

---

### Test Case 6c: Malformed Request
**Request:** POST `/api/ai/chat/recurring-job` with missing category

**Expected:**
- Status: 400 Bad Request
- Response: `{ error: "Missing required fields..." }`

**Validation Checklist:**
- [ ] Required fields validated
- [ ] Helpful error messages
- [ ] Graceful failure

---

## Test Execution Checklist

### Manual Testing (Frontend)
- [ ] Open chat dispatcher at bottom-right
- [ ] Type each scenario's user input
- [ ] Verify intent recognition
- [ ] Check response message quality
- [ ] Validate provider/estimate display
- [ ] Test user interaction with results

### Automated Testing
- [ ] Run `npm run test -- phase1.test.ts`
- [ ] Verify all intent detection tests pass
- [ ] Verify API endpoint tests pass
- [ ] Check error handling
- [ ] Monitor console for warnings/errors

### Performance Testing
- [ ] Response time < 2 seconds for intent extraction
- [ ] Provider search completes < 1 second
- [ ] Price estimation < 500ms
- [ ] No memory leaks on chat close/reopen

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Expected Coverage After Phase 1

| Intent | Coverage | Users Impacted | Revenue Value |
|--------|----------|----------------|----------------|
| RECURRING_SERVICE | ✅ | 18% | ₱864M |
| GET_QUOTE_ESTIMATE | ✅ | 28% | ₱210M |
| MODIFY_JOB | ✅ | 8% | ₱32M |
| ESCALATE_DISPUTE | ✅ | 7% | ₱28M |
| **Total Phase 1** | **~45%** | **61%†** | **₱1.164B** |

†Some users may need multiple intents in single journey

---

## Sign-Off

**Implementation Status:** Ready for testing ✅  
**Blockers:** None  
**Next Steps:** Execute test scenarios → Document results → Proceed to Phase 2
