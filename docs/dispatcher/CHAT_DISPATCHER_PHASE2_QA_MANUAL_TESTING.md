# Phase 2 Manual QA Testing Checklist

**Purpose:** Verify all 4 Phase 2 intents work correctly before staging deployment  
**Testing Approach:** Manual API testing + code review  
**Estimated Duration:** 2-4 hours  
**Prerequisites:** Development server running (`pnpm dev`)

---

## Pre-Testing Setup

### Environment Verification

- [ ] Verify OPENAI_API_KEY is set
  ```bash
  echo $OPENAI_API_KEY  # Should output key (masked in logs)
  ```

- [ ] Verify MongoDB connection
  ```bash
  # Try connecting to DB
  # Check logs for "Connected to MongoDB"
  ```

- [ ] Verify dev server is running
  ```bash
  # Should see: "ready - started server on 0.0.0.0:3000"
  ```

- [ ] Verify all Phase 2 files exist
  ```bash
  ls -la src/app/api/ai/chat/*/route.ts | grep -E "(booking|urgent|switch|vendor)"
  # Should show 4 results
  ```

### Get Authentication Token (for testing)

```bash
# Option 1: Test user account
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@localpro.com","password":"test123"}' \
  --cookie-jar cookies.txt

# Option 2: Use existing session
# Check browser DevTools > Application > Cookies
# Copy authToken value
AUTHTOKEN="your-token-here"

# Verify token works
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer $AUTHTOKEN"
```

---

## Test Scenario 1: BOOKING_INQUIRY - FAQ Matching

### Test 1.1: "How to post" question

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "How do I post a job on LocalPro?",
    "userId": "test-user-001"
  }'
```

**Expected Response:**
```json
{
  "message": "## How to Post a Job...",
  "source": "FAQ_DATABASE",
  "faqsShown": ["How to Post a Job"],
  "nextAction": "SHOW_BOOKING_INFO",
  "helpLinks": [...]
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] Response has `message` field with FAQ content
- [ ] `source` is "FAQ_DATABASE"
- [ ] `faqsShown` array is not empty
- [ ] `helpLinks` array contains valid URLs
- [ ] Response time < 500ms
- [ ] No errors in console logs

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 1.2: Payment security question

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Is my payment info secure? Does escrow protection cover everything?",
    "userId": "test-user-001"
  }'
```

**Expected Response:**
```json
{
  "message": "## Payment & Security...",
  "source": "FAQ_DATABASE",
  "faqsShown": ["Payment & Security..."],
  ...
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] Contains payment/escrow related FAQ
- [ ] Includes security information
- [ ] Response helpful and accurate

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 1.3: Cancellation question

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Can I cancel my job? What about refunds?",
    "userId": "test-user-001"
  }'
```

**Expected Response:**
```json
{
  "message": "## Cancellation & Refund Policy...",
  "source": "FAQ_DATABASE",
  "faqsShown": ["Cancellation & Refund Policy"],
  ...
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] Contains cancellation/refund info
- [ ] Policy is clear and user-friendly

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 1.4: Unmatched question (AI fallback)

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "What is your company sustainability initiative?",
    "userId": "test-user-001"
  }'
```

**Expected Response:**
```json
{
  "source": "AI_GENERATED",
  "faqsShown": [],
  "message": "I don't have specific information..."
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `source` is "AI_GENERATED" (not FAQ)
- [ ] `faqsShown` is empty array
- [ ] Response still helpful

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 1.5: Missing userMessage (error handling)

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001"
  }'
```

**Expected Response:**
```json
{
  "error": "Missing or invalid userMessage",
  ...
}
```

**Verification Checklist:**
- [ ] HTTP Status: 400 Bad Request
- [ ] Error message is clear
- [ ] No server error (500)

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

## Test Scenario 2: URGENT_SERVICE - Emergency Provider Matching

### Test 2.1: Emergency plumbing request

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/urgent-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "userMessage": "I need a plumber RIGHT NOW! Pipe burst!",
    "userId": "test-user-002",
    "jobCategory": "plumbing",
    "location": "Manila",
    "budget": 5000
  }'
```

**Expected Response:**
```json
{
  "message": "⚡ Found 5 emergency plumbers...",
  "urgentProviders": [
    {
      "providerId": "...",
      "name": "...",
      "rating": 4.7,
      "etaMinutes": 15,
      "urgentBadge": true
    },
    ...
  ],
  "premiumOption": {
    "available": true,
    "extraFee": 350,
    "guarantee": "15min arrival"
  },
  "nextAction": "SHOW_URGENT_OPTIONS"
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `urgentProviders` array has 1-5 items
- [ ] All providers have rating >= 4.5
- [ ] `etaMinutes` values are 15-30 range
- [ ] `premiumOption` includes fee (₱250-500)
- [ ] Response time < 1 second
- [ ] No 500 errors

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 2.2: Same-day urgent (not emergency)

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/urgent-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "userMessage": "I need service today within 2 hours",
    "userId": "test-user-002",
    "jobCategory": "electrical",
    "location": "Cebu",
    "budget": 3000
  }'
```

**Expected Response:**
```json
{
  "message": "Found providers for today...",
  "urgentProviders": [...]
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] Providers returned
- [ ] All ratings >= 4.5
- [ ] All ETAs <= 120 minutes

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 2.3: No providers available

*Skip if not in test data setup; document expected behavior*

**Expected Behavior:**
- [ ] Graceful fallback message
- [ ] Offers waitlist option
- [ ] No error status (200 with empty array acceptable)

**Result:** ☐ PASS ☐ N/A

**Notes:**

---

## Test Scenario 3: SWITCH_PROVIDER - Mid-Job Replacement

### Pre-Test Setup: Create test job

```bash
# Get or create a job with status "in_progress"
# Save job ID as: TEST_JOB_ID="job-123456"
# Job should be assigned for at least 45 minutes

TEST_JOB_ID="job-test-switch-001"
```

### Test 3.1: Valid provider switch

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "userMessage": "Can I switch providers? This one isnt responding",
    "userId": "test-user-003",
    "jobId": "'$TEST_JOB_ID'",
    "switchReason": "not_responding",
    "switchFeedback": "Provider not answering calls"
  }'
```

**Expected Response:**
```json
{
  "message": "We found 3 alternative providers...",
  "replacementProviders": [
    {
      "providerId": "...",
      "rating": 4.5,
      "matchScore": 0.92
    },
    ...
  ],
  "switchCount": 1,
  "currentStatus": "pending_provider_switch",
  "notificationSent": true,
  "nextAction": "CONFIRM_PROVIDER_SWITCH"
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `replacementProviders` has 3 options
- [ ] All ratings >= 4.3
- [ ] `switchCount` is 1
- [ ] `notificationSent` is true
- [ ] Current provider rated lower or similar or has issue
- [ ] No excluded providers from results

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 3.2: 30-minute rule enforcement

**Setup:** Create job assigned <10 minutes ago

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "userMessage": "Switch provider immediately",
    "userId": "test-user-003",
    "jobId": "job-new-switch",
    "switchReason": "other"
  }'
```

**Expected Response:**
```json
{
  "message": "You can switch after XX minutes...",
  "canSwitch": false,
  "minutesUntilSwitch": 23,
  "minTimeRule": "30 minutes"
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK or 400
- [ ] `canSwitch` is false
- [ ] `minutesUntilSwitch` is approximately correct
- [ ] Clear message about time rule

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 3.3: Switch limit enforcement (if possible)

**Setup:** Test job with 3 previous switches

**Expected Behavior:**
- [ ] Deny switch request
- [ ] Error message mentions limit
- [ ] Suggest support escalation

**Result:** ☐ PASS ☐ N/A (setup dependent)

**Notes:**

---

### Test 3.4: Invalid job status

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "userMessage": "Switch provider",
    "userId": "test-user-003",
    "jobId": "job-completed",
    "switchReason": "other"
  }'
```

**Expected Response:**
```json
{
  "error": "Cannot switch on completed jobs",
  "jobStatus": "completed",
  "switchableStatuses": ["assigned", "in_progress"]
}
```

**Verification Checklist:**
- [ ] HTTP Status: 400 OK
- [ ] Clear error explaining why
- [ ] Lists valid states

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

## Test Scenario 4: VENDOR_REQUEST - Partnership Inquiries

### Test 4.1: Solo provider vendor account

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Hi, Im a solo provider interested in joining",
    "userId": "vendor-test-001",
    "userEmail": "solo@provider.com",
    "vendorType": "sole_proprietor",
    "inquiryType": "vendor_account"
  }'
```

**Expected Response:**
```json
{
  "message": "Request ID: TR-1718932400000-xyz",
  "requestId": "TR-1718932400000-xyz",
  "vendorType": "sole_proprietor",
  "inquiryType": "vendor_account",
  "routedTo": "vendor_onboarding",
  "priority": "NORMAL",
  "estimatedResponse": "24-48 hours",
  "followUpInfo": {
    "requirements": "...",
    "joinBonus": "₱5,000 credit",
    ...
  },
  "nextAction": "VENDOR_INQUIRY_RECEIVED"
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] RequestID format: TR-{timestamp}-{alphanumeric}
- [ ] RequestID is unique (generate multiple, all different)
- [ ] `routedTo` is "vendor_onboarding"
- [ ] `priority` is "NORMAL"
- [ ] Estimated response is 24-48 hours
- [ ] Follow-up info includes requirements + bonus

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 4.2: Enterprise white-label (HIGH priority)

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "We need white-label solution",
    "userId": "vendor-test-002",
    "userEmail": "enterprise@company.com",
    "vendorType": "enterprise",
    "inquiryType": "white_label",
    "businessName": "Enterprise Corp"
  }'
```

**Expected Response:**
```json
{
  "requestId": "TR-...",
  "routedTo": "partnerships",
  "priority": "HIGH",
  "estimatedResponse": "2-4 hours",
  "followUpInfo": {
    "features": "Custom branding, API integration..."
  }
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `routedTo` is "partnerships"
- [ ] `priority` is "HIGH"
- [ ] Estimated response is 2-4 hours (faster)
- [ ] Follow-up includes white-label features

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 4.3: API integration request (HIGH priority)

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "We need API access to integrate",
    "userId": "vendor-test-003",
    "userEmail": "api@techcompany.com",
    "vendorType": "agency",
    "inquiryType": "api_access"
  }'
```

**Expected Response:**
```json
{
  "requestId": "TR-...",
  "routedTo": "technical_team",
  "priority": "HIGH",
  "estimatedResponse": "2-4 hours",
  "followUpInfo": {
    "documentation": "https://api.localpro.com/docs",
    "rateLimit": "10K requests/hour"
  }
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `routedTo` is "technical_team"
- [ ] `priority` is "HIGH"
- [ ] Includes API documentation link
- [ ] Mentions rate limits

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 4.4: Small team vendor account (NORMAL)

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "We are 3-person team",
    "userId": "vendor-test-004",
    "userEmail": "team@services.com",
    "vendorType": "small_team",
    "inquiryType": "vendor_account"
  }'
```

**Expected Response:**
```json
{
  "requestId": "TR-...",
  "routedTo": "vendor_onboarding",
  "priority": "NORMAL",
  "estimatedResponse": "24-48 hours"
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `routedTo` is "vendor_onboarding"
- [ ] `priority` is "NORMAL"
- [ ] Estimated response is 24-48 hours

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

## Test Scenario 5: Intent Detection & Routing

### Test 5.1: Main chat route recognizes BOOKING_INQUIRY

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "How do I post a job?"}
    ]
  }'
```

**Expected Response:**
```json
{
  "intent": "BOOKING_INQUIRY",
  "nextAction": "SHOW_BOOKING_INFO",
  ...
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `intent` is "BOOKING_INQUIRY"
- [ ] `nextAction` is "SHOW_BOOKING_INFO"
- [ ] Message field present

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 5.2: Main chat route recognizes URGENT_SERVICE

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "I need a plumber emergency right now!"}
    ]
  }'
```

**Expected Response:**
```json
{
  "intent": "URGENT_SERVICE",
  "nextAction": "SHOW_URGENT_OPTIONS",
  ...
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `intent` is "URGENT_SERVICE"
- [ ] `nextAction` is "SHOW_URGENT_OPTIONS"

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 5.3: Main chat route recognizes Phase 1 intents (backward compat)

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "I need a cleaner weekly on Sundays"}
    ]
  }'
```

**Expected Response:**
```json
{
  "intent": "RECURRING_SERVICE",
  "nextAction": "SHOW_RECURRING_OPTIONS",
  ...
}
```

**Verification Checklist:**
- [ ] HTTP Status: 200 OK
- [ ] `intent` is "RECURRING_SERVICE"
- [ ] Phase 1 still works

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

## Test Scenario 6: Performance & Load

### Test 6.1: Response time benchmarks

**For each endpoint, measure response times:**

```bash
# BOOKING_INFO
time curl -s -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"How to post?","userId":"test"}' > /dev/null

# URGENT_SERVICE (with auth)
time curl -s -X POST http://localhost:3000/api/ai/chat/urgent-service \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{"userMessage":"Urgent","userId":"test","jobCategory":"plumbing","location":"Manila","budget":5000}' > /dev/null

# SWITCH_PROVIDER (with auth)
time curl -s -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{"userMessage":"Switch","userId":"test","jobId":"job-1","switchReason":"other"}' > /dev/null

# VENDOR_REQUEST
time curl -s -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"Vendor","userId":"test","userEmail":"test@test.com","vendorType":"small_team","inquiryType":"vendor_account"}' > /dev/null
```

**Expected Results:**
- [ ] BOOKING_INFO: < 500ms
- [ ] URGENT_SERVICE: < 1000ms
- [ ] SWITCH_PROVIDER: < 1000ms
- [ ] VENDOR_REQUEST: < 500ms

**Actual Results:**
- BOOKING_INFO: _____ ms
- URGENT_SERVICE: _____ ms
- SWITCH_PROVIDER: _____ ms
- VENDOR_REQUEST: _____ ms

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

## Test Scenario 7: Error Handling

### Test 7.1: Missing authentication

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/urgent-service \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Need urgent service",
    "jobCategory": "plumbing"
  }'
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

**Verification Checklist:**
- [ ] HTTP Status: 401 Unauthorized
- [ ] Error message is clear
- [ ] Doesn't expose internal details

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 7.2: Invalid JSON

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{ invalid json'
```

**Expected Response:**
```json
{
  "error": "Invalid JSON"
}
```

**Verification Checklist:**
- [ ] HTTP Status: 400
- [ ] No 500 error (graceful handling)
- [ ] Error message helpful

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 7.3: Empty message

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{"userMessage":"","userId":"test"}'
```

**Expected Response:**
- [ ] HTTP Status: 400 or graceful empty response
- [ ] Handled without error

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

## Test Scenario 8: Database Checks

### Test 8.1: Verify switch history logging

**After SWITCH_PROVIDER test, check database:**

```bash
# Connect to MongoDB
# Check job document for switchHistory
db.jobs.findOne({_id: ObjectId("test-job-id")}, {switchHistory:1})

# Should show:
# {
#   _id: ObjectId(...),
#   switchHistory: [
#     {
#       fromProviderId: "old-provider-id",
#       reason: "not_responding",
#       feedback: "...",
#       timestamp: ISODate("2026-04-11T...")
#     }
#   ]
# }
```

**Verification Checklist:**
- [ ] switchHistory array exists and grows with each switch
- [ ] Timestamps are sequential and accurate
- [ ] Reason is preserved correctly
- [ ] Provider ID is valid

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

### Test 8.2: Verify vendor request logging

**After VENDOR_REQUEST test, check if request is saved:**

```bash
# Check if vendor_requests collection exists
db.vendor_requests.findOne({requestId: /^TR-/})

# Should show request with all fields
```

**Verification Checklist:**
- [ ] Request ID saved and unique
- [ ] All inquiry data captured
- [ ] Timestamp accurate
- [ ] Can retrieve by request ID

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

## Test Scenario 9: Integration Tests

### Test 9.1: Multi-turn conversation flow

**Simulate user conversation asking multiple questions:**

```bash
# Message 1: Ask about posting
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "How do I post a job?"}
    ]
  }' | jq '.intent'
# Should be: "BOOKING_INQUIRY"

# Message 2: Ask for urgent service
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTHTOKEN" \
  -d '{
    "messages": [
      {"role": "user", "content": "How do I post a job?"},
      {"role": "assistant", "content": "Here's how..."},
      {"role": "user", "content": "Actually, I need service urgently today"}
    ]
  }' | jq '.intent'
# Should be: "URGENT_SERVICE"
```

**Verification Checklist:**
- [ ] Conversation history preserved
- [ ] Intent correctly switches based on latest message
- [ ] Both intents recognized

**Result:** ☐ PASS ☐ FAIL

**Notes:**

---

## Final Verification Checklist

### All Tests Completed:

- [ ] Test Scenario 1: BOOKING_INQUIRY (5 tests)
- [ ] Test Scenario 2: URGENT_SERVICE (3 tests)
- [ ] Test Scenario 3: SWITCH_PROVIDER (4 tests)
- [ ] Test Scenario 4: VENDOR_REQUEST (4 tests)
- [ ] Test Scenario 5: Intent Detection (3 tests)
- [ ] Test Scenario 6: Performance (1 test)
- [ ] Test Scenario 7: Error Handling (3 tests)
- [ ] Test Scenario 8: Database Checks (2 tests)
- [ ] Test Scenario 9: Integration (1 test)

**Total Tests:** 26 manual scenarios + performance + database checks

### Summary Results:

| Scenario | Status | Issues Found | Notes |
|----------|--------|--------------|-------|
| BOOKING_INQUIRY | ☐ PASS ☐ FAIL | | |
| URGENT_SERVICE | ☐ PASS ☐ FAIL | | |
| SWITCH_PROVIDER | ☐ PASS ☐ FAIL | | |
| VENDOR_REQUEST | ☐ PASS ☐ FAIL | | |
| Intent Detection | ☐ PASS ☐ FAIL | | |
| Performance | ☐ PASS ☐ FAIL | | |
| Error Handling | ☐ PASS ☐ FAIL | | |
| Database | ☐ PASS ☐ FAIL | | |
| Integration | ☐ PASS ☐ FAIL | | |

### Issues Found (if any):

1. _______________
2. _______________
3. _______________

### Overall QA Status:

**☐ APPROVE FOR STAGING**  
**☐ NEEDS FIXES (list above)**  
**☐ CRITICAL ISSUES (blocking release)**  

---

## Sign-Off

**QA Tester:** _______________  
**Date Completed:** _______________  
**Total Time:** _____ hours  
**Environment:** Development (localhost:3000)  

**Sign-Off Authority:** _______________

---

## Next Steps

If all tests PASS:
1. → Deploy to staging
2. → Run staging tests (24 hours)
3. → Deploy to production

If tests FAIL:
1. → Document issues in detail
2. → Assign to development
3. → Re-test after fixes
4. → Repeat until all pass

