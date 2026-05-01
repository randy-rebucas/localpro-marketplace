# Sales & Partnerships Agent

This document describes the **Sales & Partnerships (B2B)** virtual team in LocalPro: how `VENDOR_REQUEST` intent is detected, how inquiries are qualified and routed, and what the API returns to clients.

For the overall agent architecture, see [ai-agent-teams.md](ai-agent-teams.md). For the orchestrator persona, see [Orchestration.md](../Orchestration.md). For the agent registry entry, see [AGENTS.md](../AGENTS.md).

---

## Role

- **Agent ID:** `sales_partnerships_team`
- **Purpose:** Strategic business development and partnership management—B2B leads, vendor programs, API access, white-label paths, and government/LGU-style partnership signals.
- **Distinction from other intents:**
  - **Consumer posting a job** → Business Operations (`BOOKING_INQUIRY` / booking lifecycle), not `VENDOR_REQUEST`.
  - **Applying to *offer services* as a provider on the marketplace** → `PROVIDER_ONBOARDING` → `/api/ai/chat/provider-onboarding`. API/white-label/LGU *commercial* deals stay `VENDOR_REQUEST` per main chat extraction rules.

> **Persona file:** [AGENTS.md](../AGENTS.md) references `ai/sales-partnership.md`. That file may not exist in every branch; runtime behavior is defined by [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts) (intent) and [src/app/api/ai/chat/vendor-request/route.ts](../src/app/api/ai/chat/vendor-request/route.ts) (handler).

---

## End-to-end flow

1. User message hits **POST** `/api/ai/chat`.
2. `extractIntent()` classifies **`VENDOR_REQUEST`** when the message matches B2B/partnership/vendor-program language (e.g. partnership, vendor account, API access, white label, wholesale, bulk enterprise, LGU partnership). See the extraction prompt in `route.ts`.
3. Server sets `nextAction` to **`VENDOR_INQUIRY_RECEIVED`** and returns `action`:
   - `action: "VENDOR_REQUEST"`
   - `vendorData`: `businessName`, `vendorType`, `inquiryType`, `message` (from extracted fields + raw message)
   - `userEmail`: set from the authenticated session’s `user.userId` in `route.ts` (field name is historical; value may be a user id, with fallback `unknown@localpro.com`)
4. **AIChatDispatcher** calls **POST** `/api/ai/chat/vendor-request` with that body.
5. Handler qualifies the lead, enqueues internal notification, optionally records monitoring, returns a rich Markdown-style **`message`** plus `requestId`, `estimatedResponse`, `nextAction: "VENDOR_REQUEST_SUBMITTED"`.

---

## Request / response contract

### Client → `/api/ai/chat/vendor-request`

| Field | Required | Description |
|-------|----------|-------------|
| `vendorData` | Yes | `vendorType`, `inquiryType`, `message`; optional `businessName` |
| `userEmail` | Optional | Populated from `user.userId` in the main chat route; stored on the request and in notifications (may not be a literal email) |

### `vendorData` enums

| Field | Values |
|-------|--------|
| `vendorType` | `sole_proprietor` \| `small_team` \| `agency` \| `enterprise` |
| `inquiryType` | `vendor_account` \| `partnership` \| `api_access` \| `white_label` |

### Handler → client (JSON)

| Field | Description |
|-------|-------------|
| `message` | User-facing confirmation and next steps (includes request id, SLA text, upsells where applicable) |
| `requestId` | Unique id (format `TR-<timestamp>-<suffix>`) |
| `status` | e.g. `received` |
| `estimatedResponse` | Human-readable SLA string by priority |
| `nextAction` | `VENDOR_REQUEST_SUBMITTED` |

Errors: `400` if `vendorData` missing; `429` if rate limited.

---

## Lead qualification (server logic)

### Industry detection

Keywords map free text (`businessName` + `message`) to one of **11** categories (e.g. Transportation & Logistics, Beauty & Personal Care, Food & Culinary, Hospitality, Construction & Infrastructure, IT & Technology). Order of evaluation prefers more specific industries. Implementation: `detectIndustry()` in `vendor-request/route.ts`.

### Score and priority

- **Base:** `scoreLeadQualification()` produces `qualificationScore` **0–100**, `priority` **`high` \| `medium` \| `standard`**, optional **`recommendedPlan`** (`Starter` / `Growth` / `Pro` / `Enterprise`), and **`upsellOpportunities`** strings.
- **Drivers:** `inquiryType` and `vendorType` dominate; government/PESO/LGU/DOLE/TESDA-style terms in `message` can **bump** score and force **high** priority with PESO-related upsell lines.

### Internal routing label (`routeToTeam`)

Used for notification targeting (not necessarily a separate product surface):

| Condition | `routeToTeam` |
|-----------|----------------|
| `inquiryType === "api_access"` | `technical_team` |
| `inquiryType === "white_label"` | `partnerships` (priority forced high) |
| `inquiryType === "partnership"` | `sales_team` |
| `vendorType === "enterprise"` | `sales_team`, priority high |
| Default | `vendor_onboarding` |

### Opportunity flags (embedded on request)

The handler computes booleans/metrics used in notifications and follow-up copy:

- **White-label candidate** — `screenWhiteLabelEligibility()`: signals for white-label/franchise, multi-location, volume; combined with vendor tier and inquiry type; outputs suggested revenue-share label and estimated value band.
- **PESO / government** — `screenPESOEligibility()`: PESO, LGU, DOLE, TESDA, DICT, workforce/registry language or government-aligned industries.
- **Managed services upsell** — `screenManagedServicesOpportunity()`: staffing/growth signals for smaller vendor types on `vendor_account` or `partnership`.

### Industry-specific user messaging

`getIndustrySpecificMessage()` Tailors one-liner routing copy for Beauty & Personal Care, Food & Culinary, Hospitality, Construction, Transportation & Logistics, IT & Technology, or a default partnerships line.

### Notifications and monitoring

- **`enqueueNotification`:** Email-style notification to `routeToTeam` as `userId`, category `VENDOR_INQUIRY`, subject reflects priority and score; body includes upsells and enhancement flags; `immediate: true` when priority is `high`.
- **`recordLeadOutcome`:** Fire-and-forget `pending` outcome for lead monitoring (`@/lib/lead-monitoring`).

### Estimated response time

| Priority | Copy used |
|----------|-----------|
| `high` | within 2–4 hours |
| `medium` | within 4–8 hours |
| `standard` | within 24–48 hours |

---

## Rate limiting

- **Vendor request endpoint:** per IP, `60_000` ms window, **max 5** requests (`vendor-request:${ip}` in `checkRateLimit`).
- Main `/api/ai/chat` has its own user-based limit; see that route for details.

---

## Integration files

| Path | Role |
|------|------|
| [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts) | `VENDOR_REQUEST` intent, `VENDOR_INQUIRY_RECEIVED`, builds `action` for client |
| [src/components/chat/AIChatDispatcher.tsx](../src/components/chat/AIChatDispatcher.tsx) | Dispatches `VENDOR_REQUEST` action to vendor-request API |
| [src/app/api/ai/chat/vendor-request/route.ts](../src/app/api/ai/chat/vendor-request/route.ts) | Lead qualification, notifications, response body |
| [src/app/api/ai/chat/vendor-request/vendor-request.test.ts](../src/app/api/ai/chat/vendor-request/vendor-request.test.ts) | Integration tests (AGENTS.md: 16 scenarios) |

---

## Product / GTM targets (from AGENTS.md)

Reference targets used for roadmap and KPIs—not enforced in code:

- Lead qualification accuracy >90%; score compute <100ms.
- Priority tier aligns with HIGH / MEDIUM / STANDARD routing.
- Response SLAs: HIGH 2–4 hours, etc.
- Upsell and pipeline metrics (white-label, partnership conversion) as tracked by operations.

---

## Changelog

- **2026-05-01:** Initial `docs/sales-partnerships-agent.md`.
