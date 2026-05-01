# LocalPro AI Agent Teams

This document describes how specialized AI “agent teams” are wired in the LocalPro codebase: orchestration, intent routing, API endpoints, and the in-app chat dispatcher.

For the executive persona and cross-team workflows, see [Orchestration.md](../Orchestration.md). For the short registry of agent IDs and integration pointers, see [AGENTS.md](../AGENTS.md).

---

## Architecture

| Layer | Responsibility | Location |
|-------|----------------|----------|
| Master Orchestrator | Org model, tone, escalation policy, KPI framing | [Orchestration.md](../Orchestration.md) |
| Intent extraction | Classify user messages, set `nextAction`, optional `requestType` / `stakeholderType` / `primaryTeam`, build `action` payloads | [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts) (`extractIntent`, `POST`) |
| Specialist handlers | Domain-specific logic, extra OpenAI calls, or structured responses | [src/app/api/ai/chat/*/route.ts](../src/app/api/ai/chat/) |
| Client dispatch | Call main chat, then follow-up POSTs based on `action` | [src/components/chat/AIChatDispatcher.tsx](../src/components/chat/AIChatDispatcher.tsx) |

**Typical flow**

1. User sends a message from the widget.
2. Client POSTs to `/api/ai/chat` with `messages`, optional `context`, and `conversationState` (e.g. `jobId`, `selectedProvider`).
3. Server runs `extractIntent()` and returns `message`, `intent`, `nextAction`, `extractedData`, and optionally `action`.
4. If `action` targets a specialist route, the client POSTs again (e.g. `/api/ai/chat/booking-info`) and appends the returned message.

**Rate limiting (main chat)**

The main `/api/ai/chat` route applies per-user rate limiting (see `checkRateLimit` in the route file). Specialist routes may apply their own limits; check each handler.

---

## Intent → team → handler

| Intent / area | Primary team | Follow-up API (when dispatched) |
|---------------|--------------|--------------------------------|
| `BOOKING_INQUIRY` | Business Operations | `/api/ai/chat/booking-info` |
| Booking lifecycle: `ASSIGN_PROVIDER`, `CONFIRM_BOOKING`, `STATUS_UPDATE`, `CANCEL_JOB`, `MODIFY_JOB`, `RECURRING_SERVICE`, `GET_QUOTE_ESTIMATE`, `URGENT_SERVICE`, `SWITCH_PROVIDER` | Business Operations | See [Business Operations](#business-operations-team) table |
| `ESCALATE_DISPUTE` | Operations → Finance/Legal (escalation) | `/api/ai/chat/escalate-dispute` |
| `VENDOR_REQUEST` | Sales & Partnerships (B2B) | `/api/ai/chat/vendor-request` |
| `MARKETING_OUTREACH` | Marketing & Outreach | `/api/ai/chat/marketing-outreach` |
| `FINANCE_LEGAL_INQUIRY` | Finance & Legal | `/api/ai/chat/finance-legal` |
| `PROVIDER_ONBOARDING` | Provider Onboarding & Quality Control | `/api/ai/chat/provider-onboarding` |

**Handled without a separate team route**

- **`ASK_QUESTION`**: Server returns clarifying questions only; no second HTTP call.
- **`GENERAL_CHAT`**: Server answers with a general LocalPro assistant prompt (aligned with orchestrator tone, privacy, and escalation rules); no specialist `action` handler.

---

## Business Operations team

**Role (product)**

- Booking validation and dispatch coordination  
- Provider matching and scheduling (product intent; implementation details vary by route/UI)  
- Customer communication (status, FAQs, modifications)  
- Same-day / urgent and recurring flows  
- Quote / estimate assistance  
- Provider switch requests  
- Cancel job  
- Dispute escalation handoff (dedicated endpoint)

**Agent ID (registry):** `business_operations_team` — see [AGENTS.md](../AGENTS.md).

> **Note:** [AGENTS.md](../AGENTS.md) references `ai/business-operation-team.md` as the long-form persona file. That file may not exist in all branches; behavior is defined by `Orchestration.md`, `extractIntent` in `route.ts`, and the handlers below.

### Server `nextAction` → client `action.action` → endpoint

| `nextAction` (from `/api/ai/chat`) | `action.action` (payload) | Endpoint |
|------------------------------------|---------------------------|----------|
| `SHOW_BOOKING_INFO` | `BOOKING_INQUIRY` | `/api/ai/chat/booking-info` |
| `STATUS_UPDATE` | `STATUS_UPDATE` | `/api/ai/chat/job-status` |
| `CANCEL_JOB` | `CANCEL_JOB` | `/api/ai/chat/cancel-job` |
| `MODIFY_JOB_CONFIRM` | `MODIFY_JOB` | `/api/ai/chat/modify-job` |
| `SHOW_RECURRING_OPTIONS` | `RECURRING_SERVICE` | `/api/ai/chat/recurring-job` |
| `SHOW_PRICE_ESTIMATE` | `GET_QUOTE_ESTIMATE` | `/api/ai/chat/price-estimate` |
| `SHOW_URGENT_OPTIONS` | `URGENT_SERVICE` | `/api/ai/chat/urgent-service` |
| `CONFIRM_PROVIDER_SWITCH` | `SWITCH_PROVIDER` | `/api/ai/chat/switch-provider` |
| `ESCALATE_DISPUTE` | `ESCALATE_DISPUTE` | `/api/ai/chat/escalate-dispute` |
| `CONFIRM_BOOKING` | (booking UI + confirm) | `/api/ai/chat/confirm-booking` |
| `ASSIGN_PROVIDER` | (provider list / selection) | Client UI; `/api/ai/chat/search-providers` exists for search integration |

### Booking inquiries (`/api/ai/chat/booking-info`)

Implements consumer “how does LocalPro work?” style questions. The route combines a **keyword FAQ knowledge base** (topics such as posting a job, payments and escrow, what information to prepare, provider verification, satisfaction/refunds, timelines, recurring services) with **LLM-assisted** answering when appropriate. It is the main informational surface for **Business Operations** outside live job state mutations.

### In-app widget behavior ([AIChatDispatcher.tsx](../src/components/chat/AIChatDispatcher.tsx))

- Maintains `conversationState`: `jobData`, `selectedProvider`, `jobId`, `jobStatus`, `urgentMode`, `switchMode`, etc.
- Dispatches follow-up requests for each `action` type listed above (booking info, job status, cancel, modify, recurring, estimate, urgent, switch, vendor, marketing, finance-legal, provider-onboarding, dispute).
- **Assign provider:** Response may set `nextAction === "ASSIGN_PROVIDER"`; the widget may show provider cards. **Confirm booking:** Opens confirmation UI and POSTs to `/api/ai/chat/confirm-booking` with `jobData` and `providerId`.

Implementations may use mock provider data in the UI until wired to real search/booking APIs—verify against current `AIChatDispatcher` and `search-providers` usage in your branch.

### Intents detected in `extractIntent` (booking-related)

The extraction prompt in [route.ts](../src/app/api/ai/chat/route.ts) includes (non-exhaustive): `ASK_QUESTION`, `ASSIGN_PROVIDER`, `CONFIRM_BOOKING`, `STATUS_UPDATE`, `CANCEL_JOB`, `BOOKING_INQUIRY`, `SWITCH_PROVIDER`, `URGENT_SERVICE`, `RECURRING_SERVICE`, `GET_QUOTE_ESTIMATE`, `MODIFY_JOB`, `ESCALATE_DISPUTE`, plus routes to other teams (`VENDOR_REQUEST`, `MARKETING_OUTREACH`, `FINANCE_LEGAL_INQUIRY`, `PROVIDER_ONBOARDING`, `GENERAL_CHAT`). Metadata fields include job details, urgency, recurring frequency, modification dates, dispute severity, switch reason, etc., as defined in the prompt’s JSON schema.

---

## Other agent teams (summary)

| Team | Endpoint | Purpose |
|------|----------|---------|
| Sales & Partnerships | `/api/ai/chat/vendor-request` | B2B / partnership / API / white-label inquiries; lead qualification — [Sales & Partnerships (deep dive)](sales-partnerships-agent.md) |
| Marketing & Outreach | `/api/ai/chat/marketing-outreach` | Press, co-marketing, sponsorships — [Marketing & Outreach (deep dive)](marketing-outreach-agent.md) |
| Finance & Legal | `/api/ai/chat/finance-legal` | Invoices, payouts, tax, contracts (informational) — [Finance & Legal (deep dive)](finance-legal-agent.md) |
| Provider Onboarding & QC | `/api/ai/chat/provider-onboarding` | Applying to offer services on the marketplace |

---

## Source index

| Path | Description |
|------|-------------|
| [Orchestration.md](../Orchestration.md) | Master orchestrator persona and workflows |
| [AGENTS.md](../AGENTS.md) | Agent registry and intent table |
| [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts) | Main chat + intent extraction |
| [src/components/chat/AIChatDispatcher.tsx](../src/components/chat/AIChatDispatcher.tsx) | Widget + action dispatch |
| [src/app/api/ai/chat/booking-info/route.ts](../src/app/api/ai/chat/booking-info/route.ts) | Booking FAQ / inquiries |
| [src/app/api/ai/chat/confirm-booking/route.ts](../src/app/api/ai/chat/confirm-booking/route.ts) | Confirm booking |
| [src/app/api/ai/chat/job-status/route.ts](../src/app/api/ai/chat/job-status/route.ts) | Job status |
| [src/app/api/ai/chat/cancel-job/route.ts](../src/app/api/ai/chat/cancel-job/route.ts) | Cancel job |
| [src/app/api/ai/chat/modify-job/route.ts](../src/app/api/ai/chat/modify-job/route.ts) | Modify job |
| [src/app/api/ai/chat/recurring-job/route.ts](../src/app/api/ai/chat/recurring-job/route.ts) | Recurring service |
| [src/app/api/ai/chat/price-estimate/route.ts](../src/app/api/ai/chat/price-estimate/route.ts) | Price estimate |
| [src/app/api/ai/chat/urgent-service/route.ts](../src/app/api/ai/chat/urgent-service/route.ts) | Urgent / same-day |
| [src/app/api/ai/chat/switch-provider/route.ts](../src/app/api/ai/chat/switch-provider/route.ts) | Switch provider |
| [src/app/api/ai/chat/search-providers/route.ts](../src/app/api/ai/chat/search-providers/route.ts) | Provider search |
| [src/app/api/ai/chat/escalate-dispute/route.ts](../src/app/api/ai/chat/escalate-dispute/route.ts) | Dispute escalation |
| [src/app/api/ai/chat/vendor-request/route.ts](../src/app/api/ai/chat/vendor-request/route.ts) | Vendor / B2B — [Sales doc](sales-partnerships-agent.md) |
| [src/app/api/ai/chat/marketing-outreach/route.ts](../src/app/api/ai/chat/marketing-outreach/route.ts) | Marketing — [Marketing doc](marketing-outreach-agent.md) |
| [src/app/api/ai/chat/finance-legal/route.ts](../src/app/api/ai/chat/finance-legal/route.ts) | Finance / legal — [Finance doc](finance-legal-agent.md) |
| [src/app/api/ai/chat/provider-onboarding/route.ts](../src/app/api/ai/chat/provider-onboarding/route.ts) | Provider onboarding |

---

## Changelog

- **2026-05-01:** Linked deep-dive docs for Sales & Partnerships and Marketing & Outreach in the summary table and source index.
- **2026-05-01:** Added [Finance & Legal (deep dive)](finance-legal-agent.md); linked from summary table and source index.
