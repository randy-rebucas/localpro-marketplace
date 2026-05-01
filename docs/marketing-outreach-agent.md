# Marketing & Outreach Agent

This document describes the **Marketing & Outreach** virtual team in LocalPro: intent detection, the specialist API, and how the chat widget chains requests.

For overall architecture, see [ai-agent-teams.md](ai-agent-teams.md). For org-level context (campaigns, brand, analytics), see [Orchestration.md](../Orchestration.md) § Marketing & Outreach Team. For the registry table, see [AGENTS.md](../AGENTS.md).

---

## Role

- **Primary team label:** Marketing & Outreach  
- **Purpose:** Brand-aware answers for **media**, **co-marketing**, **sponsorships**, **co-branding**, and **campaign-style** questions involving LocalPro—not B2B vendor accounts, API, or white-label deals (those route to **Sales & Partnerships** as `VENDOR_REQUEST`).

**Intent:** `MARKETING_OUTREACH`  
**Main chat `nextAction`:** `SHOW_MARKETING_INFO`  
**Client `action.action`:** `MARKETING_OUTREACH`  
**Specialist endpoint:** `POST` `/api/ai/chat/marketing-outreach`

---

## Intent detection (main dispatcher)

Defined in [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts) inside `extractIntent()`:

- **Examples in prompt:** press inquiry, marketing partnership, feature our brand, co-marketing, sponsor event.
- **Example line:** “We’re interested in co-marketing with LocalPro” → `MARKETING_OUTREACH` (often with `stakeholderType: MSME` when extracted).
- **Next action map:** `MARKETING_OUTREACH` → `SHOW_MARKETING_INFO`.

**Do not confuse with:**

| User goal | Intent | Endpoint |
|-----------|--------|----------|
| Co-marketing, press, sponsorships, brand campaigns with LocalPro | `MARKETING_OUTREACH` | `/api/ai/chat/marketing-outreach` |
| Vendor account, partnership revenue, API access, white label, LGU *commercial* programs | `VENDOR_REQUEST` | `/api/ai/chat/vendor-request` |

---

## End-to-end flow

1. User sends a message; client POSTs to `/api/ai/chat` with `messages` and `conversationState`.
2. Server returns an assistant `message` plus `action` when `nextAction === "SHOW_MARKETING_INFO"`:
   - `action: "MARKETING_OUTREACH"`
   - `userMessage`: original user text
   - `routing`: `{ requestType?, stakeholderType?, primaryTeam }` (defaults `primaryTeam` to `"Marketing & Outreach"` if omitted by the model)
3. [AIChatDispatcher.tsx](../src/components/chat/AIChatDispatcher.tsx) POSTs to `/api/ai/chat/marketing-outreach` with `{ userMessage, routing }`.
4. Specialist route returns `message` (LLM body), `source: "AI_GENERATED"`, `nextAction: "CONTINUE_CHAT"`. The widget appends that `message` to the thread.

---

## Specialist handler: `/api/ai/chat/marketing-outreach`

Implementation: [src/app/api/ai/chat/marketing-outreach/route.ts](../src/app/api/ai/chat/marketing-outreach/route.ts).

### Behavior

- **Input:** JSON with non-empty string `userMessage` (trimmed; **first 800 characters** used).
- **Optional:** `routing` object passed through as JSON in the **system** prompt for structured context (`requestType`, `stakeholderType`, `primaryTeam`).
- **Model:** `gpt-4o-mini`, `max_tokens: 450`, `temperature: 0.65`.
- **System persona (summary):** Act as LocalPro Marketing & Outreach; help with media, co-marketing, high-level provider-recruitment campaigns, events; **do not** commit budgets, contracts, or placements; direct formal partnerships to **Sales** and approvals to **official channels**.

### Response shape

| Field | Description |
|-------|-------------|
| `message` | Assistant reply (string) |
| `source` | `"AI_GENERATED"` |
| `nextAction` | `"CONTINUE_CHAT"` |

### Errors and limits

- **400** — missing/empty `userMessage`
- **429** — rate limit: per IP, **30** requests / **60s** (`marketing-outreach:${ip}`)
- **503** — `OPENAI_API_KEY` not set (no OpenAI client)

---

## Operational notes

- **No persistent lead record** in this route (unlike `vendor-request`): responses are generated in-session. If you need CRM or ticketing, add it at this handler or via a wrapper.
- **No dedicated test file** in-repo for this route; consider API/integration tests if marketing copy or routing rules become stricter.

---

## Source index

| Path | Role |
|------|------|
| [src/app/api/ai/chat/route.ts](../src/app/api/ai/chat/route.ts) | `MARKETING_OUTREACH` / `SHOW_MARKETING_INFO`, builds `action` + `routing` |
| [src/components/chat/AIChatDispatcher.tsx](../src/components/chat/AIChatDispatcher.tsx) | Dispatches `MARKETING_OUTREACH` to marketing-outreach API |
| [src/app/api/ai/chat/marketing-outreach/route.ts](../src/app/api/ai/chat/marketing-outreach/route.ts) | OpenAI completion for Marketing & Outreach |

---

## Changelog

- **2026-05-01:** Initial `docs/marketing-outreach-agent.md`.
