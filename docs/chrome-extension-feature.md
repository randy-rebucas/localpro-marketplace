# Feature: LocalPro Companion — Chrome Extension

## 📦 Get the Extension

**Download LocalPro Companion from the Chrome Web Store:**
- **Extension Name:** LocalPro Companion
- **Chrome Web Store Link:** https://chromewebstore.google.com/detail/localpro-companion/lkbgkaaoaiikeefgfddlblhfmkccejia

Install the extension to get real-time notifications, quick job posts, and priority alerts directly in your browser!

---

## Context

LocalPro Marketplace is a 3-sided service marketplace (Clients, Providers, Admin, PESO)
built with Next.js 16 App Router + MongoDB Atlas + TypeScript at `c:\Users\corew\localpro-marketplace`.

## Goal

Build a Chrome Extension (Manifest V3) that acts as a lightweight companion to the
LocalPro web app — exposing key actions and real-time updates without requiring the
user to keep a browser tab open.

---

## Extension Architecture

### Tech Stack

- Manifest V3
- Vanilla TypeScript (no framework — keep bundle small)
- Tailwind CSS via CDN or PostCSS for popup styling
- Background Service Worker (persistent SSE connection via fetch + ReadableStream)
- Chrome Storage API (sync) for persisting auth token + user role
- Chrome Alarms API for polling fallback

### Directory Structure

```
chrome-extension/
├── manifest.json
├── background/
│   └── service-worker.ts       # SSE listener, badge updater, alarm polling
├── popup/
│   ├── index.html
│   ├── popup.ts                # Mount point
│   └── components/
│       ├── LoginView.ts
│       ├── NotificationList.ts
│       ├── QuickJobPost.ts
│       ├── QuickQuote.ts
│       └── PaymentStatus.ts
├── content/
│   └── content-script.ts       # Text selection → Quick Job Post
└── icons/
    └── icon-{16,48,128}.png
```

---

## Authentication

Because the main app uses HttpOnly cookies, the extension cannot read them directly.
Add a new lightweight API endpoint to the Next.js app:

### New API Route: `POST /api/auth/extension-token`

- Accepts `{ email, password }` in body (same as login)
- Returns `{ token, role, name, userId }` — a short-lived JWT (1h) in the response body (not a cookie), scoped specifically for extension use
- Rate-limited to 5 req/min per IP via existing `checkRateLimit()`
- Add `"extension"` as an allowed token audience in `src/lib/auth.ts`

### Extension Storage

- Store `{ token, role, name, userId }` in `chrome.storage.sync`
- Attach `Authorization: Bearer <token>` header on all extension API calls
- On 401 response → clear storage → show LoginView

---

## Feature 1: Real-Time Notification Badge

### Backend (already built)

- SSE stream: `GET /api/notifications/stream` — already emits events via `notificationBus`
- Unread count: `GET /api/notifications?unreadOnly=true`

### Extension Behavior

- Background service worker opens SSE connection via `fetch()` + `ReadableStream`
- On each SSE event → parse `{ type, data }` → increment badge counter
- `chrome.action.setBadgeText({ text: count })` + red background
- On popup open → fetch full notification list from `/api/notifications`
- Mark read via `PATCH /api/notifications/[id]/read`

---

## Feature 2: Quick Job Post from Text Selection (Client role)

### Content Script

- User highlights any text on any webpage
- Content script detects `mouseup` + non-empty selection
- Injects a small floating button: "Post as Job on LocalPro"
- Click → opens extension popup with QuickJobPost pre-filled

### QuickJobPost Component (Popup)

- Fields: Title (pre-filled from selection), Description, Category (dropdown), Budget, Location
- Submit → `POST /api/jobs` with `Authorization: Bearer <token>`
- On success → show confirmation + link to `/client/my-jobs`

---

## Feature 3: Provider Job Alerts + Quick Quote

### Background Polling

- Chrome Alarm: every 5 minutes → `GET /api/jobs?aiRank=true&limit=5`
- Compare with last-seen job IDs stored in `chrome.storage.local`
- New jobs found → `chrome.notifications.create()` with job title + budget

### QuickQuote Component (Popup)

- Shows top 3 AI-ranked open jobs
- Expand a job → inline form: Amount, Message, Estimated Days
- Submit → `POST /api/quotes` with `jobId`
- On success → badge clears for that job, shows "Quote Sent"

---

## Feature 4: Chat / Message Popup

### Backend (already built)

- Job threads SSE: `GET /api/messages/stream/[threadId]`
- Support thread SSE: `GET /api/support/stream`
- Send message: `POST /api/messages/[threadId]`

### Extension Behavior

- Popup shows list of active job threads (from `/api/messages`)
- Click a thread → mini chat window (last 10 messages, message input)
- Send message inline without leaving current tab
- Unread message count merged into main badge

---

## Feature 5: Payment Status Tracker

### Behavior

- After a PayMongo checkout is initiated, the extension polls `GET /api/payments/[sessionId]?jobId=`
- User pastes the `sessionId` into the popup OR the content script captures it from the PayMongo redirect URL
- Background alarm polls every 30s until status = `paid`
- On confirmation → `chrome.notifications.create()`: "Payment confirmed — escrow funded!"

---

## Feature 6: PESO Officer Referral Tool (peso role only)

### Content Script (LinkedIn / Facebook / any page)

- PESO officers can highlight a person's name + contact info on any webpage
- Floating button: "Refer to LocalPro as Provider"
- Opens popup pre-filled with name/contact

### QuickReferral Component (Popup)

- Fields: Name, Contact, Barangay, Skills (tags), Livelihood Program
- Submit → `POST /api/peso/referrals`
- On success → show confirmation with provider registry link

---

## Backend Changes Needed (Next.js app)

1. **`POST /api/auth/extension-token`** — new route (extension-scoped JWT in body)
2. **`GET /api/notifications` supports `Authorization: Bearer` header** — verify token audience includes `"extension"`; currently cookie-only
3. **`src/lib/auth.ts` `getCurrentUser()`** — extend to also read `Authorization: Bearer` header in addition to cookie, so all existing routes work for extension calls without modification
4. Ensure CORS headers allow `chrome-extension://` origin on all `/api/*` routes

### CORS Config (`next.config.js` or route-level headers)

```js
// Allow extension origin
'Access-Control-Allow-Origin': 'chrome-extension://<EXTENSION_ID>'
```

---

## Manifest V3 Permissions

```json
{
  "manifest_version": 3,
  "name": "LocalPro Companion",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://your-domain.com/*",
    "http://localhost:3000/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"]
    }
  ]
}
```

---

## Implementation Order (Recommended)

| Step | Feature | Depends On |
|------|---------|------------|
| 1 | Scaffold manifest + background service worker | — |
| 2 | Auth flow (LoginView + `/api/auth/extension-token`) | Step 1 |
| 3 | Notification badge (SSE + Chrome badge API) | Step 2 |
| 4 | Quick Job Post (content script + popup form) | Step 2 |
| 5 | Provider Job Alerts + Quick Quote | Step 2 |
| 6 | Chat popup (mini ChatWindow) | Step 2 |
| 7 | Payment status tracker | Step 2 |
| 8 | PESO referral tool | Step 2 |

---

## Constraints

- Extension token is short-lived (1h) — implement silent refresh via stored credentials or prompt re-login
- HttpOnly cookies are inaccessible from the extension — all API calls MUST use `Authorization: Bearer`
- SSE in Manifest V3 service workers can be killed by Chrome — use Chrome Alarms as polling fallback
- Do not duplicate business logic — extension is a thin client that calls existing API routes only
- Follow the existing service + repository pattern when adding new backend routes
- All new API routes must use `withHandler()` + `requireUser()` from `src/lib/utils.ts` and `src/lib/auth.ts`
