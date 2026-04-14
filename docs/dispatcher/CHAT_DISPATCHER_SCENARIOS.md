# AI Chat Dispatcher - Expected User Scenarios & Prompts

## Platform Context
LocalPro is a Philippines-based service marketplace with:
- **24 job categories** (plumbing, electrical, cleaning, carpentry, etc)
- **Business tiers** (Standard → Silver → Gold → Platinum)
- **Escrow protection** (fund locking mechanism)
- **Reviews & ratings** system
- **Team/Business management** features
- **Urgent job** capability (same-day, rush)
- **Recurring services** (weekly, monthly schedules)

---

## 📋 User Prompt Scenarios

### Category 1: URGENT/EMERGENCY JOBS (HIGH PRIORITY)

#### 1.1 Same-Day Emergency
```
"The electricity went out in my house - I need an electrician NOW"
"Water leak in bathroom - emergency, I'm in Makati"
"AC not working during summer - URGENT please"
"Pipe burst in kitchen - calling an emergency plumber"
```
**Intent:** ASSIGN_PROVIDER with urgency: "rush"
**Missing Data:** None (location implied from context)
**Gap:** Should detect emergency keywords ("now", "urgent", "emergency", "leak", "burst")

#### 1.2 Time-Sensitive Jobs
```
"I need a carpenter tomorrow morning before 10am"
"Can someone do plumbing work this evening?"
"I have a guest arriving in 2 hours - need cleaning"
"My event is this weekend - need setup help"
```
**Intent:** ASSIGN_PROVIDER with urgency: "same_day"
**Gap:** Schedule date extraction needs improvement

---

### Category 2: SERVICE-SPECIFIC JOB POSTING

#### 2.1 Home Repairs
```
"Fix my leaking roof - it's raining heavily"
"Paint my bedroom walls - whole room needs new paint"
"Install ceiling fan in living room"
"Fix the doorknob and hinges"
```
**Intent:** ASK_QUESTION (missing budget/location) → ASSIGN_PROVIDER
**Gap:** Should recognize common home service keywords

#### 2.2 Electrical Work
```
"I need to add new electrical outlet in my kitchen"
"The light in my hallway is broken - need electrician"
"Install a new breaker box"
"My electricity bill is too high - can someone check?"
```
**Intent:** ASSIGN_PROVIDER (category: electrical)
**Gap:** Should auto-detect category from keywords

#### 2.3 Cleaning Services
```
"Need house cleaning for my 3-bedroom apartment"
"Post-construction cleaning after renovation"
"Deep cleaning for move-out - 2 bedroom condo"
"Carpet cleaning and upholstery services needed"
```
**Intent:** ASSIGN_PROVIDER
**Gap:** Should differentiate between residential/commercial cleaning

#### 2.4 Tech Services
```
"My laptop won't turn on - need tech support"
"Need to setup WiFi router in my office"
"Phone screen is broken - where to get fixed?"
"My computer is running slow - needs maintenance"
```
**Intent:** ASSIGN_PROVIDER (category: tech)
**Gap:** Remote vs on-site service distinction needed

---

### Category 3: BUDGET & PRICING QUERIES

#### 3.1 Price Estimation
```
"How much would it cost to repaint a 3-bedroom house?"
"What's the average price for electrical work?"
"How much to clean a 2-bedroom apartment?"
"Price estimate for wood flooring installation?"
```
**Intent:** GENERAL_CHAT (should respond with price ranges)
**Gap:** NEW INTENT NEEDED: "GET_QUOTE_ESTIMATE"

#### 3.2 Budget Constraints
```
"I have ₱5,000 budget - what can I get fixed?"
"Can I find a plumber for under ₱2,000?"
"Budget is ₱20,000 for kitchen renovation"
"We can pay ₱500-1000 per week for cleaning"
```
**Intent:** ASSIGN_PROVIDER with budget filter
**Gap:** Multiple providers with budget filtering needed

---

### Category 4: PROVIDER QUALITY & SELECTION

#### 4.1 Provider Preferences
```
"I want a highly-rated electrician with 100+ jobs completed"
"Find me a provider with 5-star ratings only"
"I need someone who speaks English well"
"Looking for a female cleaner - any available?"
```
**Intent:** ASSIGN_PROVIDER with filters
**Gap:** NEW: Provider filter system (rating, gender, language, specialty)

#### 4.2 Provider Features
```
"Do you have any providers who offer payment plans?"
"Can I get someone who does consultations first?"
"Is there a provider with emergency availability?"
"Any providers offering warranty on work?"
```
**Intent:** GENERAL_CHAT (then ASSIGN_PROVIDER or CONSULTATION)
**Gap:** Consultation flow not implemented

---

### Category 5: MULTI-JOB & RECURRING SERVICES

#### 5.1 Recurring Services
```
"I need weekly house cleaning every Saturday"
"Monthly plumbing maintenance contract"
"Bi-weekly lawn mowing service"
"Daily security patrol for my business"
```
**Intent:** ASSIGN_PROVIDER with recurring: {frequency, duration}
**Gap:** NEW INTENT: "RECURRING_SERVICE"

#### 5.2 Multiple Jobs
```
"I need both electrical and plumbing work done"
"Can I get a general contractor to do roof + walls?"
"Want to post jobs for multiple locations at once"
"Need cleaning for 3 different properties"
```
**Intent:** MULTIPLE_ASSIGN_PROVIDER
**Gap:** Batch job creation not supported

---

### Category 6: BOOKING & SCHEDULING

#### 6.1 Specific Scheduling
```
"Schedule for next Monday at 2pm"
"Can they come on April 15th between 3-5pm?"
"I'm available only on weekends"
"Morning slots work best for me"
```
**Intent:** ASSIGN_PROVIDER with date/time window
**Gap:** Time window extraction not implemented

#### 6.2 Flexible Scheduling
```
"Sometime this week, just let me know"
"Whenever you have availability, just come by"
"Next Monday or Tuesday, no preference"
"ASAP but after my work hours"
```
**Intent:** ASSIGN_PROVIDER with flexible scheduling
**Gap:** Flexible scheduling intent not defined

---

### Category 7: TRACKING & STATUS

#### 7.1 Real-Time Status (Already Implemented ✓)
```
"Where is my provider? How far?"
"What's the status of my job?"
"Can you give me an ETA?"
"Is the provider on the way?"
```
**Intent:** STATUS_UPDATE ✓

#### 7.2 Completion & Payment
```
"The work looks good, how do I pay?"
"How do I approve the work and release payment?"
"What happens after the job is done?"
```
**Intent:** NEW: "APPROVE_WORK" / "RELEASE_PAYMENT"

#### 7.3 Issues During Work
```
"The provider is late - can you send someone else?"
"This doesn't match what I requested"
"They're asking for more money"
"The quality is not acceptable"
```
**Intent:** NEW: "ESCALATE_DISPUTE" / "REQUEST_REPLACEMENT"

---

### Category 8: CANCELLATION & CHANGES

#### 8.1 Cancellation Scenarios (Already Implemented ✓)
```
"Cancel my request"
"I changed my mind - cancel the job"
"Need to stop this job"
```
**Intent:** CANCEL_JOB ✓

#### 8.2 Modification Requests
```
"Can I change the date of my appointment?"
"I want to add more work to my order"
"Can I reduce the scope and lower the price?"
"Need to postpone this to next week"
```
**Intent:** NEW: "MODIFY_JOB"

#### 8.3 Rescheduling
```
"Our provider cancelled on me - can you find someone else?"
"Can this be moved to tomorrow instead?"
"I need to reschedule - something came up"
```
**Intent:** NEW: "RESCHEDULE_JOB"

---

### Category 9: REVIEWS & HISTORY

#### 9.1 Past Jobs
```
"Show me my completed jobs"
"Who did I hire last month for the electrical work?"
"Can I see my previous plumber's contact?"
"History of all jobs at my address"
```
**Intent:** NEW: "VIEW_JOB_HISTORY"

#### 9.2 Reviews & Ratings
```
"I want to rate my provider 5 stars"
"How do I leave a review?"
"Can I see reviews from other clients?"
"What happened to my review - can I edit it?"
```
**Intent:** NEW: "LEAVE_REVIEW" / "VIEW_REVIEWS"

---

### Category 10: ACCOUNT & PAYMENT

#### 10.1 Payment Issues
```
"Why was I charged twice?"
"How do I add a payment method?"
"Can I get an invoice for this job?"
"What's this ₱100 fee on my bill?"
```
**Intent:** GENERAL_CHAT (escalate to support)
**Gap:** Payment inquiry should trigger support escalation

#### 10.2 Business Account Features
```
"I want to upgrade to Gold tier"
"Can I manage multiple locations?"
"How do I add my team members?"
"What's included in the Business plan?"
```
**Intent:** GENERAL_CHAT (with upsell opportunity)
**Gap:** Tier upgrade flow not implemented

#### 10.3 Referral & Loyalty
```
"How do I get referral rewards?"
"What's my current loyalty points balance?"
"Can I redeem points for discount?"
"How do I invite my friend to LocalPro?"
```
**Intent:** NEW: "CHECK_LOYALTY" / "GET_REFERRAL_LINK"

---

### Category 11: CONSULTATION REQUESTS

#### 11.1 On-Site Consultation
```
"I want a consultation before deciding"
"Can someone come look at the damage first?"
"Need expert opinion before hiring"
"Free estimate for the work?"
```
**Intent:** NEW: "REQUEST_CONSULTATION"

#### 11.2 Virtual Consultation
```
"Can I send photos and get a quote?"
"Video call consultation available?"
"Can I describe the issue instead of visit?"
```
**Intent:** NEW: "VIRTUAL_CONSULTATION"

---

### Category 12: COMPLEX / MULTI-STEP JOBS

#### 12.1 Project Management
```
"I'm renovating my kitchen - who can manage the whole project?"
"Need a general contractor to coordinate plumbing + electrical + carpentry"
"My construction project needs on-site manager"
```
**Intent:** ASSIGN_PROVIDER (specialization: project management)
**Gap:** Project management intent not supported

#### 12.2 Phased Jobs
```
"First job - assessment. Then fix it. Then follow-up check"
"Can we do this in stages and pay per stage?"
"Milestone-based payments possible?"
```
**Intent:** NEW: "PHASED_JOB" / "MILESTONE_PAYMENT"

---

### Category 13: SPECIAL REQUESTS

#### 13.1 Skill Combination
```
"Need someone who does both carpentry AND electrical"
"Looking for handyman who can do everything"
"Need a one-stop shop for home maintenance"
```
**Intent:** ASSIGN_PROVIDER (multi-skill)
**Gap:** Multi-skill matching not implemented

#### 13.2 Availability & Flexibility
```
"Do you have providers available on Sunday?"
"Can someone work through the holidays?"
"Need evening/night shift availability"
```
**Intent:** ASSIGN_PROVIDER (with availability filter)
**Gap:** Availability scheduling not implemented

#### 13.3 Special Conditions
```
"Need someone with KYC verification"
"Background-checked provider required"
"Insurance and bonded required for this job"
```
**Intent:** ASSIGN_PROVIDER (with compliance filters)
**Gap:** Background check filtering not implemented

---

### Category 14: LOCATION & SERVICE AREA

#### 14.1 Location-Based
```
"Is there a plumber in Quezon City?"
"Can they reach Taguig?"
"I'm in a condo - is this okay?"
"Do they serve provincial areas?"
```
**Intent:** GENERAL_CHAT (location validation)
**Gap:** Service area validation missing

#### 14.2 Travel & Extra Charges
```
"How much extra for travel?"
"Do they charge for coming to Cavite?"
"What if my location is far?"
```
**Intent:** GENERAL_CHAT
**Gap:** Travel cost estimation missing

---

### Category 15: SPECIAL USER TYPES

#### 15.1 Business Client Queries
```
"I need to post jobs for 5 different stores"
"Set up recurring cleaning for all our branches"
"How do I manage my team on LocalPro?"
"What's the API for integration?"
```
**Intent:** GENERAL_CHAT (escalate to business team)
**Gap:** Business intent routing missing

#### 15.2 Provider Account Setup
```
"How do I start working as a provider?"
"What documents do I need to provide?"
"How do I set up my provider profile?"
"When can I start getting jobs?"
```
**Intent:** GENERAL_CHAT (onboarding flow)
**Gap:** Provider onboarding intent missing

---

## 📊 Scenario Distribution Analysis

| Category | Count | Currently Handled | Gap |
|----------|-------|-------------------|-----|
| **Urgent/Emergency** | 5 | ⚠️ Partial | Urgency keyword detection |
| **Service-Specific** | 12 | ✓ Yes | Category auto-detection |
| **Budget/Pricing** | 6 | ⚠️ Partial | Price estimates, range filtering |
| **Provider Quality** | 6 | ⚠️ Partial | Provider filters, preferences |
| **Multi-Job/Recurring** | 5 | ❌ No | Recurring service intent |
| **Booking/Scheduling** | 6 | ⚠️ Partial | Time window extraction |
| **Tracking/Status** | 3 | ✓ Yes | STATUS_UPDATE fully implemented |
| **Cancellation/Changes** | 6 | ⚠️ Partial | Modification intent needed |
| **Reviews/History** | 4 | ❌ No | Job history, reviews flow |
| **Account/Payment** | 6 | ⚠️ Partial | Payment escalation needed |
| **Consultation** | 4 | ❌ No | Consultation request flow |
| **Complex Projects** | 4 | ❌ No | Project management intent |
| **Special Requests** | 6 | ❌ No | Multi-skill, compliance filters |
| **Location** | 4 | ⚠️ Partial | Service area validation |
| **Special Users** | 4 | ❌ No | Business, provider onboarding |
| **TOTAL** | **76** | **19%** | **81% gaps** |

---

## 🎯 High-Impact NEW Intents to Add

### Priority 1: HIGH VALUE (5+ scenarios each)

1. **GET_QUOTE_ESTIMATE** - Price ranges, budget filtering
   ```typescript
   "How much for X service?"
   "Budget is ₱Y - what can I get?"
   → Response: Price ranges + available providers
   ```

2. **RECURRING_SERVICE** - Weekly/monthly recurring jobs
   ```typescript
   "Weekly house cleaning"
   "Monthly maintenance contract"
   → Create recurring job with frequency
   ```

3. **MODIFY_JOB** - Change dates, scope, budget
   ```typescript
   "Can I reschedule to tomorrow?"
   "Add more tasks to this job"
   → Update job before assignment
   ```

4. **ESCALATE_DISPUTE** - Quality complaints, pricing issues
   ```typescript
   "Work quality is poor"
   "Provider asking for extra money"
   → Create dispute, notify support
   ```

### Priority 2: MEDIUM VALUE (3-4 scenarios each)

5. **REQUEST_CONSULTATION** - Pre-work estimates
6. **VIEW_JOB_HISTORY** - Past jobs, provider history
7. **LEAVE_REVIEW** - Rate and review
8. **CHECK_LOYALTY** - Points balance, referral status

### Priority 3: NICE-TO-HAVE (1-2 scenarios each)

9. **RESCHEDULE_JOB** - Reschedule existing job
10. **REQUEST_REPLACEMENT** - Get different provider
11. **RELEASE_PAYMENT** - Approve work, release escrow
12. **GET_REFERRAL_LINK** - Get referral code

---

## 🔄 Conversation Flow Examples

### Example 1: Complex Emergency → Multi-Action
```
User: "Water leak in my kitchen ceiling - URGENT"
↓ [Extract: category=plumbing, urgency=rush, location=implied]
System: "Found your location. Let me find emergency plumbers..."
↓ [ASSIGN_PROVIDER action]
System: "Got 2 urgent plumbers available. Juan has 4.9 rating, 50 jobs"
User: "Book the first one"
↓ [CONFIRM_BOOKING action]
System: "Booking confirmed! Juan arriving in 15 minutes"
User: "Where is he now?"
↓ [STATUS_UPDATE action]
System: "Juan is 10 minutes away, heading to your address"
```

### Example 2: Recurring Service + Budget
```
User: "Need weekly cleaning service, budget ₱8,000/month"
↓ [Extract: category=cleaning, recurring=weekly, budget=8000]
System: "That's ₱2,000/week = ₱2,000 per visit. Found 5 providers..."
↓ [RECURRING_SERVICE + price filtering]
System: [Shows providers matching criteria]
User: "Which one has best reviews?"
↓ [Filter by rating]
System: "Maria has 4.9/5 with 200+ cleaning jobs"
User: "Book her for weekly starting tomorrow"
↓ [ASSIGN_PROVIDER + RECURRING_SERVICE]
```

### Example 3: Quality Issue → Escalation
```
User: "Job is done but quality is poor"
↓ [Extract: complaint intent]
System: "What's the issue? [ASK_QUESTION]"
User: "Electrical outlet is loose and lights flicker"
↓ [ESCALATE_DISPUTE intent]
System: "This is a safety issue. Let me escalate to support..."
↓ [Create dispute + notify support + provider]
System: "Dispute #2841 created. Support reviewing..."
```

---

## 💡 Enhancement Recommendations

### Short-term (Week 1-2)
1. Add urgency keyword detection ("emergency", "urgent", "ASAP", "NOW")
2. Auto-detect category from job description keywords
3. Implement price estimate responses
4. Add time extraction for "tomorrow", "next Monday", etc

### Mid-term (Week 3-4)
1. Implement RECURRING_SERVICE intent
2. Add MODIFY_JOB capability
3. Provider filtering (rating, skills, specialization)
4. Consultation request flow

### Long-term (Month 2+)
1. Project management workflow
2. Complex multi-skill matching
3. Team/business account integration
4. Advanced scheduling with calendars
5. Payment & dispute automation
