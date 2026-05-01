# Finance & Legal Agent

This document describes the **Finance & Legal** virtual team in LocalPro: intent detection, the specialist API, guardrails, and chat flow.

For overall architecture, see [ai-agent-teams.md](ai-agent-teams.md). For org-level context (revenue, compliance, contracts), see [Orchestration.md](../Orchestration.md) § Finance & Legal Team. For the registry table, see [AGENTS.md](../AGENTS.md).

---

## Role

- **Primary team label:** Finance & Legal  
- **Purpose:** High-level, **informational** orientation on invoices, payouts, commissions, tax paperwork *orientation*, and compliance FAQs—without acting as legal or tax counsel.

**Intent:** `FINANCE_LEGAL_INQUIRY`  
**Main chat `nextAction`:** `SHOW_FINANCE_LEGAL_INFO`  
**Client `action.action`:** `FINANCE_LEGAL_INQUIRY`  
**Specialist endpoint:** `POST` `/api/ai/chat/finance-legal`

---

## Intent detection (main dispatcher)

Defined in [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts) inside `extractIntent()`:

- **Scoped to:** Invoices, payouts, commissions, tax documents, contracts, compliance wording—**informational** questions (e.g. commission statement, invoice copy, withholding tax, legal department, terms dispute **as documentation / process**, not an active job fight).
- **Example:** “I need my commission statement for taxes” → `FINANCE_LEGAL_INQUIRY` with `primaryTeam: Finance & Legal` when extracted.
- **Next action map:** `FINANCE_LEGAL_INQUIRY` → `SHOW_FINANCE_LEGAL_INFO`.

**Do not confuse with:**

| User goal | Intent | Endpoint |
|-----------|--------|----------|
| Commission statements, tax paperwork *where to get them*, invoice copies, general compliance FAQs | `FINANCE_LEGAL_INQUIRY` | `/api/ai/chat/finance-legal` |
| **Active job** quality, payment dispute, refund for **this job**, safety | `ESCALATE_DISPUTE` | `/api/ai/chat/escalate-dispute` |
| How escrow works when **booking** as a customer | Often `BOOKING_INQUIRY` | `/api/ai/chat/booking-info` |
| B2B partnership / vendor programs | `VENDOR_REQUEST` | `/api/ai/chat/vendor-request` |

The main chat returns a short bridge message: *finance and compliance-aware guidance; human review may be needed for legal or high-risk matters.*

---

## End-to-end flow

1. User sends a message; client POSTs to `/api/ai/chat`.
2. When `nextAction === "SHOW_FINANCE_LEGAL_INFO"`, response includes `action`:
   - `action: "FINANCE_LEGAL_INQUIRY"`
   - `userMessage`: original user text
   - `routing`: `{ requestType?, stakeholderType?, primaryTeam }` (defaults `primaryTeam` to `"Finance & Legal"` if omitted)
3. [AIChatDispatcher.tsx](../src/components/chat/AIChatDispatcher.tsx) POSTs to `/api/ai/chat/finance-legal` with `{ userMessage, routing }`.
4. Specialist returns `message`, `source: "AI_GENERATED"`, `nextAction: "CONTINUE_CHAT"`; the widget appends `message`.

---

## Specialist handler: `/api/ai/chat/finance-legal`

Implementation: [src/app/api/ai/chat/finance-legal/route.ts](../src/app/api/ai/chat/finance-legal/route.ts).

### Behavior

- **Input:** JSON with non-empty string `userMessage` (trimmed; **first 800 characters** used).
- **Optional:** `routing` object embedded in the **system** prompt as JSON for context.
- **Model:** `gpt-4o-mini`, `max_tokens: 450`, **`temperature: 0.4`** (lower than Marketing for more conservative wording).
- **System persona (summary):** Assist with general Finance & Legal **orientation** (invoices, payouts, commissions, tax paperwork orientation, compliance FAQs). **Not** a lawyer or accountant. **Never** draft binding contracts or give legal/tax advice—point users to official support, dashboards, or licensed professionals. **Flag** fraud, disputes over **active jobs**, or safety for **human support**.

### Response shape

| Field | Description |
|-------|-------------|
| `message` | Assistant reply (string) |
| `source` | `"AI_GENERATED"` |
| `nextAction` | `"CONTINUE_CHAT"` |

### Errors and limits

- **400** — missing/empty `userMessage`
- **429** — rate limit: per IP, **30** requests / **60s** (`finance-legal:${ip}`)
- **503** — `OPENAI_API_KEY` not set

---

## Operational notes

- **No document generation or account mutations** in this route—only LLM text. Official artifacts (statements, BIR forms, signed agreements) must come from product/support/accounting.
- **Escalation** is instructed in the system prompt; there is no automatic ticket from this handler unless you add one.
- **No dedicated test file** in-repo for this route.

---

## Source index

| Path | Role |
|------|------|
| [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts) | `FINANCE_LEGAL_INQUIRY` / `SHOW_FINANCE_LEGAL_INFO`, builds `action` + `routing` |
| [src/components/chat/AIChatDispatcher.tsx](../src/components/chat/AIChatDispatcher.tsx) | Dispatches `FINANCE_LEGAL_INQUIRY` to finance-legal API |
| [src/app/api/ai/chat/finance-legal/route.ts](../src/app/api/ai/chat/finance-legal/route.ts) | OpenAI completion for Finance & Legal |

---

## Changelog

- **2026-05-01:** Initial `docs/finance-legal-agent.md`.
