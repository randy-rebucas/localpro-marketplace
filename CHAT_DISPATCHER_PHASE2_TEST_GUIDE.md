# Phase 2 Testing & QA Guide

**Phase 2 Intent Testing** - 4 New Intents, 20+ Test Scenarios  
**Testing Framework:** Manual + API testing with cURL  
**Expected Coverage:** 100% of Phase 2 code paths  
**Estimated Time:** 4-6 hours full testing cycle

---

## Test Scenario 1: BOOKING_INQUIRY - FAQ Matching

### Scenario 1.1: Exact FAQ Match - "How to Post"

**User Input:**
```
"How do I post a job on LocalPro?"
```

**Expected Flow:**
1. AI extracts intent: BOOKING_INQUIRY
2. Routes to `/api/ai/chat/booking-info`
3. Matches FAQ: "How to Post a Job"
4. Returns markdown with steps + help link

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "How do I post a job on LocalPro?",
    "userId": "test-user-123",
    "jobContext": null
  }' | jq
```

**Expected Response:**
```json
{
  "message": "## How to Post a Job\n\n1. Sign up or log in\n2. Click 'Post a Job'\n...",
  "source": "FAQ_DATABASE",
  "faqsShown": ["How to Post a Job"],
  "nextAction": "SHOW_BOOKING_INFO",
  "helpLinks": [
    {"title": "Posting Guide", "url": "/help/post-job"}
  ]
}
```

**Success Criteria:**
- ✅ Response has FAQ answer
- ✅ Links are valid URLs
- ✅ `source` is "FAQ_DATABASE"
- ✅ Response time <500ms

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 1.2: Multiple FAQ Keywords

**User Input:**
```
"Is my payment info secure? How do I know the escrow is protecting me?"
```

**Expected Flow:**
1. Matches 2 FAQs: "Payment Security" + "Quality Guarantee"
2. Returns both FAQs as most relevant
3. Formats with clear distinction

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Is my payment info secure? How do I know the escrow is protecting me?",
    "userId": "test-user-123",
    "jobContext": null
  }' | jq
```

**Expected Response:**
```json
{
  "message": "## Payment & Security / Escrow Protection\n\n...\n\n## Quality Guarantee & Dispute Resolution\n\n...",
  "source": "FAQ_DATABASE",
  "faqsShown": ["Payment & Security...", "Quality Guarantee..."],
  "nextAction": "SHOW_BOOKING_INFO"
}
```

**Success Criteria:**
- ✅ Both FAQs included
- ✅ Clear markdown formatting with headers
- ✅ `faqsShown` has 2+ entries

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 1.3: FAQ Not Found - AI Fallback

**User Input:**
```
"What's your company's sustainability initiative?"
```

**Expected Flow:**
1. No FAQ keywords match
2. Falls back to AI generation
3. Acknowledges question, provides generic answer
4. Suggests relevant help topics

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "What is your company sustainability initiative?",
    "userId": "test-user-123",
    "jobContext": null
  }' | jq
```

**Expected Response:**
```json
{
  "message": "I don't have specific information about that topic in our FAQ, but here are some related resources that might help:\n\n- [Help Center](/help)\n...",
  "source": "AI_GENERATED",
  "faqsShown": [],
  "nextAction": "SHOW_BOOKING_INFO"
}
```

**Success Criteria:**
- ✅ `source` is "AI_GENERATED"
- ✅ `faqsShown` is empty array
- ✅ Graceful fallback message
- ✅ Suggests help resources

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 1.4: Partial FAQ Match

**User Input:**
```
"Can I cancel my job after posting?"
```

**Expected Flow:**
1. Matches FAQ: "Cancellation & Refund Policy"
2. Returns with cancellation steps + notice period

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Can I cancel my job after posting?",
    "userId": "test-user-123",
    "jobContext": null
  }' | jq
```

**Expected Response:**
```json
{
  "message": "## Cancellation & Refund Policy\n\n...",
  "source": "FAQ_DATABASE",
  "faqsShown": ["Cancellation & Refund Policy"],
  "nextAction": "SHOW_BOOKING_INFO"
}
```

**Success Criteria:**
- ✅ Cancellation policy returned
- ✅ Refund information included
- ✅ Clear next steps

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Test Scenario 2: URGENT_SERVICE - Emergency Provider Matching

### Scenario 2.1: Emergency Request - High Priority

**User Input:**
```
"I need a plumber RIGHT NOW! My pipe is burst!"
```

**Expected Flow:**
1. AI extracts: URGENT_SERVICE
2. Urgency level: EMERGENCY
3. Routes to `/api/ai/chat/urgent-service`
4. Filters providers: rating ≥ 4.5
5. Returns top 5 with ETA estimates

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/urgent-service \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I need a plumber RIGHT NOW! My pipe is burst!",
    "userId": "test-user-123",
    "jobCategory": "plumbing",
    "location": "Manila",
    "budget": 5000
  }' | jq
```

**Expected Response:**
```json
{
  "message": "⚡ Found 5 emergency plumbers available:\n\n1. **Juan Hernandez** (★4.8) - ETA: 15 min - ₱850",
  "urgentProviders": [
    {
      "providerId": "prov-001",
      "name": "Juan Hernandez",
      "rating": 4.8,
      "etaMinutes": 15,
      "busyStatus": "available",
      "urgentBadge": true,
      "basePrice": 850,
      "urgentJobCount": 156
    },
    {...},
    {...}
  ],
  "bestMatch": "prov-001",
  "premiumOption": {
    "available": true,
    "extraFee": 350,
    "guarantee": "15min arrival"
  },
  "nextAction": "SHOW_URGENT_OPTIONS"
}
```

**Success Criteria:**
- ✅ All providers have rating ≥ 4.5
- ✅ Returned exactly 5 providers (or fewer if not available)
- ✅ `urgentBadge` true for high-experience providers
- ✅ ETA values reasonable (15-30 min range)
- ✅ Premium option has fee amount
- ✅ Response time <1s

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 2.2: Same-Day Request

**User Input:**
```
"I need service today, within 2 hours if possible"
```

**Expected Flow:**
1. Urgency: URGENT
2. Filters for 4.5+ rating (slightly relaxed from emergency)
3. Prioritizes by ETA within 2 hours

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/urgent-service \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I need service today, within 2 hours if possible",
    "userId": "test-user-123",
    "jobCategory": "electrical",
    "location": "Cebu",
    "budget": 3000
  }' | jq
```

**Expected Response:**
```json
{
  "message": "Found 5 available providers for today:",
  "urgentProviders": [
    {
      "providerId": "prov-002",
      "name": "Carlos Santos",
      "rating": 4.6,
      "etaMinutes": 45,
      ...
    },
    {...}
  ]
}
```

**Success Criteria:**
- ✅ All ETAs ≤ 120 minutes
- ✅ All ratings ≥ 4.5
- ✅ Sorted by ETA ascending

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 2.3: No Urgent Providers Available

**User Input:**
```
"Emergency urgent service needed now"
```

**Expected Flow (Test Data Setup):**
1. Assume all qualified providers are busy/offline
2. Should show fallback options or waitlist

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/urgent-service \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Emergency urgent service needed now",
    "userId": "test-user-999",
    "jobCategory": "specialty-repair",
    "location": "Remote-Island",
    "budget": 2000
  }' | jq
```

**Expected Response (No Options Case):**
```json
{
  "message": "We don't have urgent specialists available right now, but we can...",
  "urgentProviders": [],
  "bestMatch": null,
  "fallbackOptions": {
    "waitlist": true,
    "notifyWhen": "ASAP",
    "estimatedWait": "30-60 minutes"
  },
  "nextAction": "SHOW_URGENT_OPTIONS"
}
```

**Success Criteria:**
- ✅ Graceful fallback when no providers
- ✅ Offers waitlist option
- ✅ Clear messaging about alternatives

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 2.4: Premium Urgent Option

**User Input:**
```
"I need someone in 15 minutes max, no matter the cost"
```

**Expected Flow:**
1. High urgency + budget sufficient
2. Shows premium option prominently
3. Explains guarantee + extra fee

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/urgent-service \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I need someone in 15 minutes max no matter the cost",
    "userId": "test-user-123",
    "jobCategory": "plumbing",
    "location": "Manila",
    "budget": 10000
  }' | jq '.premiumOption'
```

**Expected Response:**
```json
{
  "available": true,
  "extraFee": 500,
  "basePrice": 850,
  "totalWithPremium": 1350,
  "guarantee": "15-minute arrival or money back",
  "priority": "GUARANTEED"
}
```

**Success Criteria:**
- ✅ Premium fee ₱250-₱500 range
- ✅ Guarantee clearly stated
- ✅ Available when budget sufficient
- ✅ Not shown when budget <fee amount

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Test Scenario 3: SWITCH_PROVIDER - Mid-Job Provider Changes

### Scenario 3.1: Valid Provider Switch

**User Input:**
```
"Can I switch to a different service provider? The current one isn't responding."
```

**Setup:**
- Active job: `job-001` with status `in_progress`
- Current provider: `prov-abc`
- Switch history: 0 entries
- Time with provider: 45 minutes

**Expected Flow:**
1. AI extracts: SWITCH_PROVIDER
2. Validates job status (in_progress) ✅
3. Checks switch limit (0 < 3) ✅
4. Checks 30-min rule (45 > 30) ✅
5. Searches replacement providers
6. Notifies current provider
7. Returns top 3 alternatives

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Can I switch to a different service provider? The current one isnt responding.",
    "userId": "test-user-123",
    "jobId": "job-001",
    "switchReason": "not_responding",
    "switchFeedback": "Provider not responding to messages for 30 minutes"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "We found 3 alternative providers for your job:\n\n1. **Maria Cruz** (★4.7) - Available now",
  "replacementProviders": [
    {
      "providerId": "prov-xyz",
      "name": "Maria Cruz",
      "rating": 4.7,
      "matchScore": 0.92,
      "availability": "immediate"
    },
    {...},
    {...}
  ],
  "switchCount": 1,
  "currentStatus": "pending_provider_switch",
  "notificationSent": true,
  "nextAction": "CONFIRM_PROVIDER_SWITCH"
}
```

**Success Criteria:**
- ✅ 3 providers returned
- ✅ All have rating ≥ 4.3
- ✅ None matching current provider ID
- ✅ switchCount incremented
- ✅ Current provider notification sent
- ✅ Job status updated to pending_provider_switch

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 3.2: Switch Blocked - Too Many Attempts

**User Input:**
```
"Switch provider again please"
```

**Setup:**
- Job: `job-002`
- Status: `in_progress`
- Switch history: 3 entries already
- Time with current: 25 minutes

**Expected Flow:**
1. Validates switch limit (3 >= 3) ❌
2. Returns error message
3. Suggests escalation to support

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Switch provider again please",
    "userId": "test-user-456",
    "jobId": "job-002",
    "switchReason": "other"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "You've already switched providers 3 times for this job. To maintain quality service, we limit switches to 3 per job. Please escalate to our support team if you're experiencing issues.",
  "switchCount": 3,
  "maxSwitches": 3,
  "canSwitch": false,
  "supportInfo": {
    "contactEmail": "support@localpro.com",
    "ticketNumber": "SWITCH-LIMIT-job-002"
  },
  "nextAction": "ESCALATE_TO_SUPPORT"
}
```

**Success Criteria:**
- ✅ Clear error message
- ✅ Explains limit (3 switches)
- ✅ Offers support escalation
- ✅ No provider search attempted

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 3.3: Switch Blocked - 30-Minute Rule

**User Input:**
```
"Switch provider, this one isn't working out"
```

**Setup:**
- Job: `job-003`
- Status: `assigned`
- Time with provider: 5 minutes
- Switch history: 0 entries

**Expected Flow:**
1. Validates 30-min rule (5 < 30) ❌
2. Returns countdown message
3. Shows when switch becomes available

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Switch provider this one isnt working out",
    "userId": "test-user-789",
    "jobId": "job-003",
    "switchReason": "poor_work"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "You can switch providers after 25 minutes. Your current provider deserves a fair chance to show up and start work. Please try to reach them first.",
  "canSwitch": false,
  "minutesUntilSwitch": 25,
  "minTimeRule": "30 minutes",
  "nextAction": "REMIND_TO_CONTACT_PROVIDER"
}
```

**Success Criteria:**
- ✅ Countdown accurate (25-30 minutes remaining)
- ✅ Explains reason for rule
- ✅ Suggests contacting provider first
- ✅ No switch attempted

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 3.4: Invalid Job Status - Cannot Switch

**User Input:**
```
"Switch the provider"
```

**Setup:**
- Job: `job-004`
- Status: `completed` (cannot switch once finished)
- User attempting switch

**Expected Flow:**
1. Validates job status ❌
2. Returns error (job not switchable)

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Switch the provider",
    "userId": "test-user-abc",
    "jobId": "job-004",
    "switchReason": "other"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "You can only switch providers for active jobs (assigned or in-progress status). This job has already been completed.",
  "jobStatus": "completed",
  "switchableStatuses": ["assigned", "in_progress"],
  "canSwitch": false,
  "nextAction": "SHOW_JOB_DETAILS"
}
```

**Success Criteria:**
- ✅ Error reason explained
- ✅ Shows valid switch statuses
- ✅ Suggests viewing job details
- ✅ No switch attempted

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Test Scenario 4: VENDOR_REQUEST - B2B Partnerships

### Scenario 4.1: Small Team Wanting to Become Vendor

**User Input:**
```
"Hi, we're a 3-person team interested in becoming service providers on LocalPro"
```

**Expected Flow:**
1. AI extracts: VENDOR_REQUEST
2. Vendor type: `small_team`
3. Inquiry type: `vendor_account`
4. Routes to Vendor Onboarding team
5. Priority: NORMAL
6. Generates request ID & sends notification

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Hi, were a 3-person team interested in becoming service providers on LocalPro",
    "userId": "test-vendor-123",
    "userEmail": "team@smallservices.com",
    "vendorType": "small_team"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "Thank you for your interest! We've created a vendor request for your team:\n\n**Request ID:** TR-1718932400000-xK9mP4qL\n\nOur Vendor Onboarding team will contact you within 24-48 hours at team@smallservices.com",
  "requestId": "TR-1718932400000-xK9mP4qL",
  "vendorType": "small_team",
  "inquiryType": "vendor_account",
  "status": "received",
  "routedTo": "vendor_onboarding",
  "priority": "NORMAL",
  "estimatedResponse": "24-48 hours",
  "followUpInfo": {
    "vendorDashboard": "https://vendor.localpro.com/dashboard",
    "requirements": "Business registration, provider verification, insurance",
    "nextSteps": "You'll receive an email with onboarding link"
  },
  "nextAction": "VENDOR_INQUIRY_RECEIVED"
}
```

**Success Criteria:**
- ✅ Request ID format: TR-{timestamp}-{random}
- ✅ Routed to vendor_onboarding
- ✅ Priority is NORMAL
- ✅ Estimated response 24-48 hours
- ✅ Follow-up info includes vendor dashboard
- ✅ Email notification sent

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 4.2: Enterprise White-Label Request

**User Input:**
```
"We're a large enterprise and interested in a white-label solution"
```

**Expected Flow:**
1. AI extracts: VENDOR_REQUEST
2. Vendor type: `enterprise`
3. Inquiry type: `white_label`
4. Routes to Partnerships team
5. Priority: HIGH (escalated)
6. Faster response time claimed

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Were a large enterprise and interested in a white-label solution",
    "userId": "test-vendor-enterprise",
    "userEmail": "procurement@enterprise.com",
    "vendorType": "enterprise",
    "businessName": "Enterprise Corp"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "Thank you for your interest in white-label partnership!\n\n**Request ID:** TR-1718932500000-aB2cD3eF\n\nOur Partnerships team will prioritize your request and contact you within 2-4 hours",
  "requestId": "TR-1718932500000-aB2cD3eF",
  "vendorType": "enterprise",
  "inquiryType": "white_label",
  "status": "received",
  "routedTo": "partnerships",
  "priority": "HIGH",
  "estimatedResponse": "2-4 hours",
  "followUpInfo": {
    "partnership": "https://localpro.com/enterprise-partnership",
    "features": "Custom branding, API integration, dedicated support",
    "contractInfo": "Enterprise Service Agreement (ESA) included"
  },
  "notificationPriority": "HIGH",
  "nextAction": "VENDOR_INQUIRY_RECEIVED"
}
```

**Success Criteria:**
- ✅ Priority is HIGH
- ✅ Estimated response is 2-4 hours (faster)
- ✅ Routed to partnerships team
- ✅ Follow-up includes partnership terms
- ✅ Email marked HIGH priority for team

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 4.3: API Integration Request

**User Input:**
```
"We need API access to integrate LocalPro into our platform"
```

**Expected Flow:**
1. AI extracts: VENDOR_REQUEST
2. Vendor type: `agency`
3. Inquiry type: `api_access`
4. Routes to Technical Team
5. Priority: HIGH (technical complexity)

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "We need API access to integrate LocalPro into our platform",
    "userId": "test-tech-partner",
    "userEmail": "api@techcompany.com",
    "vendorType": "agency",
    "inquiryType": "api_access"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "Great! We can provide API access for integration.\n\n**Request ID:** TR-1718932600000-xYz1W2vU\n\nOur Technical Team will review your requirements and contact you within 2-4 hours",
  "requestId": "TR-1718932600000-xYz1W2vU",
  "vendorType": "agency",
  "inquiryType": "api_access",
  "status": "received",
  "routedTo": "technical_team",
  "priority": "HIGH",
  "estimatedResponse": "2-4 hours",
  "followUpInfo": {
    "documentation": "https://api.localpro.com/docs",
    "apiKeys": "Provided upon approval",
    "rateLimit": "10K requests/hour for approved partners",
    "support": "Dedicated technical support channel"
  },
  "nextAction": "VENDOR_INQUIRY_RECEIVED"
}
```

**Success Criteria:**
- ✅ Priority is HIGH
- ✅ Routed to technical_team
- ✅ Follow-up includes API documentation
- ✅ mentions rate limits & support

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Scenario 4.4: Sole Proprietor Partnership

**User Input:**
```
"Hi, I'm a solo provider looking to partner with LocalPro"
```

**Expected Flow:**
1. Vendor type: `sole_proprietor`
2. Inquiry type: `partnership` (or detection)
3. Routes to Vendor Onboarding (default)
4. Priority: NORMAL
5. Basic vendor account path

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/vendor-request \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Hi Im a solo provider looking to partner with LocalPro",
    "userId": "test-solo-001",
    "userEmail": "solo@provider.com",
    "vendorType": "sole_proprietor"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "Welcome! We'd love to have you as a LocalPro provider.\n\n**Request ID:** TR-1718932700000-pQ4rS5tU\n\nOur Vendor Onboarding team will contact you within 24-48 hours",
  "requestId": "TR-1718932700000-pQ4rS5tU",
  "vendorType": "sole_proprietor",
  "inquiryType": "vendor_account",
  "routedTo": "vendor_onboarding",
  "priority": "NORMAL",
  "estimatedResponse": "24-48 hours",
  "followUpInfo": {
    "requirements": "Government ID, TIN, Business permit, Insurance",
    "joinBonus": "₱5,000 credit for first 10 jobs",
    "commission": "15-20% depending on category",
    "portal": "https://vendor.localpro.com"
  },
  "nextAction": "VENDOR_INQUIRY_RECEIVED"
}
```

**Success Criteria:**
- ✅ Priority is NORMAL
- ✅ Routed to vendor_onboarding
- ✅ Estimated response 24-48 hours
- ✅ Includes commission info
- ✅ Join bonus mentioned

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Integration Test Scenarios

### Scenario 5.1: Full Chat Flow - User Books Emergency Service

**Sequence:**
1. User asks: "I need urgent plumbing"
2. AI recognizes URGENT_SERVICE
3. Shows 5 providers with ETA
4. User selects provider
5. Job created and assigned

**Expected Results:**
- ✅ Both URGENT_SERVICE and job creation work together
- ✅ Provider notification sent
- ✅ Chat shows confirmation

**Test Steps:**
- [ ] Post URGENT_SERVICE request
- [ ] Verify providers returned
- [ ] Create job with selected provider
- [ ] Confirm job status = assigned

**Test Result:** [ ] Pass [ ] Fail

---

### Scenario 5.2: Chat Flow - Provider Switch Mid-Job

**Sequence:**
1. Job in-progress for 45 min
2. User: "Switch provider"
3. AI recognizes SWITCH_PROVIDER
4. Current provider notified
5. Alternatives displayed
6. User confirms switch
7. New provider assigned

**Expected Results:**
- ✅ All validations pass
- ✅ Notifications work
- ✅ Job reassignment succeeds

**Test Steps:**
- [ ] Verify job is in_progress
- [ ] Post switch request
- [ ] Check current provider notification
- [ ] Reassign to new provider
- [ ] Verify job status stays in_progress

**Test Result:** [ ] Pass [ ] Fail

---

### Scenario 5.3: Chat Flow - Referral Company Inquiry

**Sequence:**
1. Visitor: "We want to integrate LocalPro"
2. AI recognizes VENDOR_REQUEST (API access)
3. Inquiry routed to technical team
4. Request ID generated
5. Team receives notification
6. Follow-up email with API docs

**Expected Results:**
- ✅ Routing logic works
- ✅ Request ID unique
- ✅ Notification sent to correct team

**Test Steps:**
- [ ] Post vendor request with api_access type
- [ ] Verify request ID format
- [ ] Check notification in team inbox
- [ ] Verify follow-up includes API docs link

**Test Result:** [ ] Pass [ ] Fail

---

## Performance Tests

### Test: Response Time Benchmark

**Goal:** All endpoints <2s under normal load

**BOOKING_INQUIRY:**
- Expected: <500ms
- Actual: [ ] Pass [ ] Fail
- Notes:

**URGENT_SERVICE:**
- Expected: <1s
- Actual: [ ] Pass [ ] Fail
- Notes:

**SWITCH_PROVIDER:**
- Expected: <1s
- Actual: [ ] Pass [ ] Fail
- Notes:

**VENDOR_REQUEST:**
- Expected: <500ms
- Actual: [ ] Pass [ ] Fail
- Notes:

---

### Test: Concurrent Load

**Send 10 simultaneous requests to each endpoint**

```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/ai/chat/booking-info \
    -H "Content-Type: application/json" \
    -d '{"userMessage":"How do I post?","userId":"user-'$i'"}' &
done
wait
```

**Results:**
- Success rate: [ ] 100% [ ] 90-99% [ ] <90%
- Error count: ___
- Error types: ___
- Max response time: ___

---

## Error Handling Tests

### Test: Missing Required Fields

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/booking-info \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-123"}'  # Missing userMessage
```

**Expected:** 400 Bad Request with clear error message

**Result:** [ ] Pass [ ] Fail
**Response:**
```json

```

---

### Test: Invalid Job ID for Switch

**Command:**
```bash
curl -X POST http://localhost:3000/api/ai/chat/switch-provider \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","jobId":"invalid-job","switchReason":"poor_work"}'
```

**Expected:** 404 or 400 with job not found message

**Result:** [ ] Pass [ ] Fail

---

## Database/State Verification

### After SWITCH_PROVIDER Request

**Verify in MongoDB:**

```bash
# Check job.switchHistory was appended
db.jobs.findOne({_id: ObjectId("job-001")}, {switchHistory: 1})

# Expected output:
# switchHistory: [
#   {
#     fromProviderId: "old-prov",
#     reason: "not_responding",
#     feedback: "...",
#     timestamp: ISODate("...")
#   }
# ]

# Check job status
db.jobs.findOne({_id: ObjectId("job-001")}, {status: 1})
# Expected: status: "pending_provider_switch"
```

**Verification Results:**
- [ ] switchHistory appended correctly
- [ ] Timestamp valid
- [ ] Job status updated
- [ ] Provider ID still references old provider (before reassignment)

---

### After VENDOR_REQUEST

**Verify request was logged:**

```bash
# Check if vendor_request collection created
db.vendor_requests.findOne({requestId: /^TR-/})

# Expected:
# {
#   requestId: "TR-1718932400000-xK9mP4qL",
#   userId: "test-vendor-123",
#   email: "team@smallservices.com",
#   vendorType: "small_team",
#   inquiryType: "vendor_account",
#   createdAt: ISODate("..."),
#   status: "new"
# }
```

**Verification Results:**
- [ ] Request logged to database
- [ ] RequestID format correct
- [ ] All fields captured
- [ ] Timestamp accurate

---

## Sign-Off

**Testing Completed By:** _______________  
**Date:** _______________  
**Total Test Cases:** 20+  
**Passed:** ___ / 20+  
**Failed:** ___ / 20+  
**Blocked:** ___ / 20+  

**Overall Phase 2 Status:**
- [ ] ✅ READY FOR PRODUCTION DEPLOYMENT
- [ ] 🟡 NEEDS FIXES (list below)
- [ ] ❌ DO NOT DEPLOY

**Failures/Blocks to Address:**

---

**Sign-Off Authority Signature:** _______________

