# LocalPro AI Agents & Team Personas

This file registers specialized AI agents for business domain functions within LocalPro.

## Registered Agents

### Master Orchestrator (routing persona)

- **ID:** `master_orchestrator`
- **Description:** Cross-functional coordination persona for intent routing, escalation policy, and unified tone across virtual teams.
- **Type:** Orchestration layer (system prompts + dispatcher metadata)
- **Location:** [Orchestration.md](Orchestration.md) (full persona: workflows, KPIs, escalation, ethical constraints)
- **Integration Points:**
  - [src/app/api/ai/chat/route.ts](src/app/api/ai/chat/route.ts) — `extractIntent()` dispatcher preamble, optional `requestType` / `stakeholderType` / `primaryTeam` on responses, general-chat escalation & privacy rules
  - In-app chat widget: [src/components/chat/AIChatDispatcher.tsx](src/components/chat/AIChatDispatcher.tsx) — follows `action` payloads to specialized handlers below

**Intent → virtual team → API handler**

| Intent | Primary team | Handler |
|--------|----------------|---------|
| `BOOKING_INQUIRY`, booking lifecycle (`ASSIGN_PROVIDER`, `CONFIRM_BOOKING`, `STATUS_UPDATE`, `CANCEL_JOB`, `MODIFY_JOB`, `RECURRING_SERVICE`, `GET_QUOTE_ESTIMATE`, `URGENT_SERVICE`, `SWITCH_PROVIDER`) | Business Operations | `/api/ai/chat` actions → booking-info, confirm-booking, job-status, cancel-job, modify-job, recurring-job, price-estimate, urgent-service, switch-provider, etc. |
| `VENDOR_REQUEST` | Sales & Partnerships (B2B) | `/api/ai/chat/vendor-request` |
| `MARKETING_OUTREACH` | Marketing & Outreach | `/api/ai/chat/marketing-outreach` |
| `FINANCE_LEGAL_INQUIRY` | Finance & Legal | `/api/ai/chat/finance-legal` |
| `PROVIDER_ONBOARDING` | Provider Onboarding & Quality Control | `/api/ai/chat/provider-onboarding` |
| `ESCALATE_DISPUTE` | Operations → Finance/Legal (human escalation) | `/api/ai/chat/escalate-dispute` |

### 1. Sales & Partnerships Team
- **ID:** `sales_partnerships_team`
- **Description:** Strategic business development and partnership management specialist
- **Type:** Domain Expert (Team Persona)
- **Location:** `ai/sales-partnership.md`
- **Primary Use Cases:**
  - **B2B Partnership Inquiry Response:** Respond to VENDOR_REQUEST intents with intelligent lead qualification and routing recommendations
  - **Sales Proposal Generation:** Create partnership proposals, pricing models, and revenue share agreements tailored to customer segment (MSME, Enterprise, Government)
  - **Lead Qualification:** Score leads 0-100 based on vendor type, inquiry type, industry, and transaction potential
  - **Industry-Specific Outreach:** Generate discovery call agendas and outreach messages tailored to 11 service categories
  - **Government Partnership Strategy:** Position PESO integration, workforce registry, and compliance framework for LGU partnerships (DOLE, TESDA, DICT)
  - **White-Label & Franchise Planning:** Design revenue share models and implementation roadmaps for scaling partnerships

- **Key Capabilities:**
  - Lead scoring matrix (sole proprietor → small team → agency → enterprise)
  - Inquiry type classification (vendor_account, partnership, api_access, white_label)
  - Industry detection from context (11 categories)
  - Upsell opportunity identification (Growth/Pro/Enterprise plans, white-label licensing, managed services)
  - Segment-specific value propositions (MSMEs, Enterprises, Government)
  - Discovery call agendas (20-30 min, segment-specific)
  - Partnership proposal templates with real commission rates and business plan tiers
  - Government program positioning and compliance framework

- **Integration Points:**
  - `src/app/api/ai/chat/vendor-request/route.ts` - Automatic lead qualification and routing (live, production-ready)
  - `src/app/api/ai/chat/vendor-request/vendor-request.test.ts` - 16 integration tests (all passing)
  - `src/app/api/ai/chat/route.ts` - VENDOR_REQUEST intent detection

- **Performance Targets:**
  - Lead qualification accuracy: >90%
  - Lead score calculation: <100ms
  - Discovery call agenda generation: <2 seconds
  - Priority assignment accuracy: Matches routing tier (HIGH/MEDIUM/STANDARD)
  - Upsell opportunity detection rate:Measurable improvement in VENDOR_REQUEST coverage (current 5% → target 15%+)

- **Success Metrics:**
  - Lead qualification score distribution (target: 20% HIGH, 40% MEDIUM, 40% STANDARD)
  - Upsell opportunities identified per lead (target: 2-3 per MEDIUM/HIGH priority lead)
  - Partnership conversion rate from qualified inquiries (target: 25%+ within 60 days)
  - Response time to HIGH priority inquiries (target: 2-4 hours)
  - White-label pipeline value (target: ₱50M+)

### 2. Business Operations Team
- **ID:** `business_operations_team`
- **Description:** Service operations and workflow management specialist
- **Type:** Domain Expert (Team Persona)
- **Location:** `ai/business-operation-team.md`
- **Primary Use Cases:**
  - Booking & dispatch coordination
  - Provider matching and scheduling
  - Customer communication & status updates
  - Service quality monitoring
  - Issue escalation & resolution

---

## Agent Invocation

To use these agents in code or conversations:

### From Codebase
```typescript
// Sales Partnership Agent - Used for VENDOR_REQUEST handling
import { POST } from "@/app/api/ai/chat/vendor-request/route";

// The handler automatically applies the Sales Partnership agent logic:
// 1. Detects industry from business name/message
// 2. Scores lead qualification (0-100)
// 3. Identifies upsell opportunities
// 4. Assigns priority & routes to appropriate team
// 5. Generates industry-specific response messaging
```

### From Conversations
Reference this file or the specific agent prompt:
- **"@Sales Partnership Team"** - Use sales-partnership.md prompt for partnership-related queries
- **"@Business Operations Team"** - Use business-operation-team.md prompt for operational queries

---

## Phase 2 Integration Status

**Deployment:** Multi-endpoint Phase 2 released April 11, 2026
- BOOKING_INQUIRY: 12% coverage, ₱480M potential
- URGENT_SERVICE: 9% coverage, ₱540M potential
- SWITCH_PROVIDER: 6% coverage, ₱210M potential
- **VENDOR_REQUEST: 5% coverage, ₱180M potential** ← Sales Partnership agent focus
- **Orchestrator expansion:** `PROVIDER_ONBOARDING`, `MARKETING_OUTREACH`, `FINANCE_LEGAL_INQUIRY` routed via Master Orchestrator dispatcher ([Orchestration.md](Orchestration.md)) to dedicated chat endpoints

**Sales Partnership Agent Activation:** April 15, 2026
- Integrated into vendor-request handler with intelligent lead qualification
- 16 integration tests deployed (100% pass rate)
- Ready to unlock VENDOR_REQUEST gap via strategic lead scoring & upselling

---

## Recent Improvements (April 2026)

✅ **Sales Partnership Prompt Refinement (Phase A)**
- Updated with Phase 2 metrics (₱3.054B total potential, 77% coverage)
- Injected real commission models (15% base, 20% premium, 10% recurring)
- Business plan tiers with multi-location support (Starter → Growth → Pro → Enterprise)
- 4 industry-specific discovery call agendas
- Lead qualification scoring matrix with upsell triggers
- Concrete partnership proposal templates

✅ **Vendor Request Handler Integration (Phase B)**
- Industry detection from 11 service categories
- Lead qualification scoring (0-100) based on vendor type + inquiry type
- Automatic upsell opportunity identification
- Priority assignment (HIGH: 2-4hr, MEDIUM: 4-8hr, STANDARD: 24-48hr)
- Industry-specific response messaging

✅ **Test Suite & Validation (Phase C)**
- 16 integration tests covering:
  - 5 lead qualification scenarios (STANDARD → MEDIUM → HIGH)
  - 3 industry detection accuracy checks
  - 4 routing & team assignment validations
  - 2 response quality & actionability checks
  - 2 error handling scenarios
- All tests passing (16/16)
- Performance: <100ms per request (Phase 2 SLA compliant)

---

## Roadmap & Future Enhancements

- **Phase 4 (Q2 2026):** White-label licensing partnership acceleration
  - Revenue share model options for mid-market partners (60/40 to 50/50 scaling)
  - Co-branding templates for franchise expansion
  
- **Phase 5 (Q3 2026):** Government partnership formalization
  - PESO program deep integration (workforce registry, certification tracking)
  - LGU compliance reporting automation
  - DOLE/TESDA alignment & certification pathways

- **Phase 6 (Q4 2026):** Managed services & partner ecosystem
  - Launch managed staffing services offering
  - Partner training program integration
  - Cross-selling framework (training, insurance, financing)
