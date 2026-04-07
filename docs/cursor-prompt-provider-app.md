# Cursor Prompt — LocalPro Provider Mobile App

> Paste this entire prompt into Cursor's composer when starting the React Native project.

---

## Project Overview

Build a **React Native mobile app (Expo SDK 52)** for the **Provider** role of **LocalPro Marketplace** — a 3-sided service marketplace for the Philippines. Providers browse open job listings, submit competitive quotes, fulfill accepted jobs, manage earnings, and grow their business profile.

The backend is a live Next.js 16 API. You will consume it via REST. All auth uses **HttpOnly cookies** (the API sets them on login). Use `credentials: 'include'` on every fetch or configure axios with `withCredentials: true`.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | Expo SDK 52 + React Native |
| Navigation | Expo Router v4 (file-based, same feel as Next.js App Router) |
| State | Zustand |
| Data fetching | TanStack Query v5 (`@tanstack/react-query`) |
| Forms | React Hook Form + Zod |
| Styling | NativeWind v4 (Tailwind for RN) |
| HTTP | Axios with `withCredentials: true` |
| Real-time | SSE via `EventSource` polyfill (`react-native-sse`) |
| Image upload | `expo-image-picker` + multipart POST |
| Maps | `react-native-maps` (service area visualizer) |
| Notifications | Expo Push Notifications (`expo-notifications`) |
| Storage | `expo-secure-store` |
| Documents | `expo-document-picker` (proposal doc upload) |

---

## Base API Configuration

```
Base URL: https://<EXPO_PUBLIC_API_URL>
All requests: { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
On 401: call POST /api/auth/refresh, then retry once. If refresh fails → logout.
```

Expose `EXPO_PUBLIC_API_URL` via `app.config.js` from `.env`.

---

## Auth Flow

1. **Splash** → check `GET /api/auth/me`. If 200 and role is `provider` → go to Home. If 401 → Login.
2. **Login** → `POST /api/auth/login` → on success, server sets cookies → navigate to Home.
3. **Register** → `POST /api/auth/register` with `role: "provider"` → prompt email verification.
   - After email verified, provider must complete profile before being approved by admin.
4. **Phone login** → `POST /api/auth/phone/send` → `POST /api/auth/phone/verify`.
5. **Logout** → `POST /api/auth/logout` → clear Zustand store → navigate to Login.
6. **Email verification** + **Password reset** handled via deep links.

Store auth user in Zustand: `{ id, name, email, role, avatar, isEmailVerified }`.

> **Approval gate**: If `providerProfile.isApproved === false`, show an "Account Pending Approval" screen instead of the main app. Check this on every app resume.

---

## Screen Map (Expo Router file structure)

```
app/
  _layout.tsx                     ← Root layout: QueryClient, Zustand hydration, auth guard
  (auth)/
    login.tsx
    register.tsx
    phone-login.tsx
    forgot-password.tsx
    reset-password.tsx             ← Deep link
    verify-email.tsx               ← Deep link
    pending-approval.tsx           ← Shown when isApproved = false
  (app)/
    _layout.tsx                    ← Tab navigator (Marketplace, My Jobs, Earnings, Messages, Profile)
    index.tsx                      ← Provider Dashboard / Home
    marketplace/
      index.tsx                    ← Open job listings (AI ranked)
      [id].tsx                     ← Job detail + submit quote
      [id]/quote.tsx               ← Submit / edit quote form
    jobs/
      index.tsx                    ← My active / past jobs
      [id].tsx                     ← Active job detail
      [id]/chat.tsx                ← Job chat thread with client
      [id]/upload-completion.tsx   ← Upload completion photo (to release escrow)
      [id]/withdraw.tsx            ← Withdraw from a job
    quotes/
      index.tsx                    ← All submitted quotes (and their status)
      [id].tsx                     ← Quote detail
    earnings/
      index.tsx                    ← Wallet balance + earnings summary
      transactions.tsx             ← Full transaction history
      withdraw.tsx                 ← Request payout to bank
    messages/
      index.tsx                    ← All message threads
      [threadId].tsx               ← Chat window
    notifications/
      index.tsx                    ← Notification list
    support/
      index.tsx                    ← Support chat with admin
    consultations/
      index.tsx                    ← Incoming consultation requests
      [id].tsx                     ← Consultation detail + respond + messages
    quote-templates/
      index.tsx                    ← Saved quote templates list
      new.tsx                      ← Create template
      [id]/edit.tsx                ← Edit template
    profile/
      index.tsx                    ← Public profile preview + edit own info
      skills.tsx                   ← Manage skills
      service-areas.tsx            ← Add / remove service areas on map
      certifications.tsx           ← Upload certifications (PESO)
      portfolio.tsx                ← Portfolio photos
      settings.tsx                 ← Notification preferences
    loyalty/
      index.tsx                    ← Points, tier, referral code
    announcements/
      index.tsx                    ← Platform announcements
    search/
      index.tsx                    ← Search jobs / clients
```

---

## Key Screens — Spec

### Provider Dashboard (`app/(app)/index.tsx`)
- Welcome header with avatar + name + verification badge
- Stats row: Active Jobs | Pending Quotes | Wallet Balance | Avg Rating
- Profile completion progress bar (if < 100%) with "Complete Profile" CTA
- "Marketplace" shortcut (open jobs count)
- Recent job activity feed (last 5 jobs)
- Announcements banner (`GET /api/announcements`)

### Job Marketplace (`app/(app)/marketplace/index.tsx`)
- List of `open` jobs available to quote (`GET /api/jobs?status=open`)
- **AI ranking toggle**: when enabled, appends `&aiRank=true` → GPT-4o-mini ranked by provider profile relevance
- Filter bar: category, location, budget range, tags
- Job cards:
  - Title, category, budget, location distance (if GPS enabled)
  - PESO/LGU/Emergency tag chips (for tagged jobs)
  - `isPriority` jobs pinned to top with a "Priority" ribbon
  - "Already Quoted" badge if provider has submitted a quote
- Tap → Job Detail

### Job Detail + Quote (`app/(app)/marketplace/[id].tsx`)
- Full job info: title, description, category, budget, location, tags, photos
- Client name + rating
- Existing quotes count (anonymous — provider can't see others' amounts)
- "Submit Quote" button → Quote form screen
- If already quoted: "Edit Quote" | "Retract Quote"

### Submit / Edit Quote (`app/(app)/marketplace/[id]/quote.tsx`)
- Quote form fields:
  - Proposed amount (with labor + materials breakdown)
  - Timeline (text)
  - Milestones table (add/remove rows: title + amount)
  - Notes textarea
  - AI "Suggest Reply" button (`POST /api/ai/suggest-replies`)
  - AI "Generate Quote Message" button (`POST /api/ai/generate-quote-message`)
  - Attach proposal document (`expo-document-picker`)
  - Site photos (image picker, multiple)
- **Load from Template**: bottom sheet picker of saved templates
- Submit → `POST /api/quotes` | Edit → `PUT /api/quotes/[id]`

### My Jobs (`app/(app)/jobs/index.tsx`)
- Tabs: Active | Completed | Disputed | Withdrawn
- Job cards: title, client name, agreed amount, status, start date
- Tap → Job Detail

### Active Job Detail (`app/(app)/jobs/[id].tsx`)
- Job info + agreed amount
- Escrow status indicator (funded / pending)
- Action buttons by status:
  - `active` → Chat with Client | Upload Completion Photo
  - `completed_pending_review` → Awaiting client release
  - `disputed` → View Dispute
- Withdraw button (if still `active`) → withdraw confirmation screen

### Upload Completion Photo (`app/(app)/jobs/[id]/upload-completion.tsx`)
- Image picker (required)
- Caption / notes field
- Submit → PATCH job (completion photo endpoint)
- Triggers admin / client notification

### Withdraw from Job (`app/(app)/jobs/[id]/withdraw.tsx`)
- Reason text area (required)
- Confirm button → `POST /api/jobs/[id]/withdraw`
- Warn: "Withdrawing may affect your rating"

### My Quotes (`app/(app)/quotes/index.tsx`)
- List: job title, amount, status (pending / accepted / rejected / retracted)
- Status color chips
- Tap → Quote Detail

### Quote Detail (`app/(app)/quotes/[id].tsx`)
- Full quote breakdown
- Status: pending → show "Retract" button
- If accepted → "Go to Job" button

### Earnings / Wallet (`app/(app)/earnings/index.tsx`)
- Balance card (available PHP balance)
- Earnings summary: this month / all time
- Mini transaction list (last 5) with "See All" → transactions screen
- "Withdraw to Bank" CTA → withdraw screen
- Commission info: "LocalPro takes 10% per completed job"

### Transaction History (`app/(app)/earnings/transactions.tsx`)
- Paginated list (`GET /api/transactions`)
- Filter: All | Escrow Released | Commission | Withdrawal | Referral Bonus
- Each row: type icon, description, amount (green = credit, red = debit), date
- Export CSV option (`GET /api/transactions/export`)

### Withdrawal Request (`app/(app)/earnings/withdraw.tsx`)
- Available balance display
- Amount input (min ₱100)
- Bank details form: bank name, account number, account name
- Submit → `POST /api/wallet/withdraw`
- Pending withdrawal status list

### Message Threads (`app/(app)/messages/index.tsx`)
- All threads (`GET /api/messages/threads`)
- Each thread: other party name + avatar, job title, last message preview, unread badge, timestamp
- Tap → Chat window

### Chat Window (`app/(app)/messages/[threadId].tsx` and `app/(app)/jobs/[id]/chat.tsx`)
- Real-time SSE: `GET /api/messages/stream/[threadId]`
- Send: `POST /api/messages/[threadId]`
- Attachment: `POST /api/messages/[threadId]/attachment` (image picker, multipart)
- AI "Suggest Reply" button inline → `POST /api/ai/suggest-replies`
- Messages grouped by date, read receipts, timestamps

### Consultations (`app/(app)/consultations/`)
- Incoming requests list (`GET /api/consultations?status=pending`)
- Each card: client name, type (site inspection / chat), location, title
- Detail screen:
  - Client info, job description, photos
  - Accept / Decline with estimate amount + note (`PUT /api/consultations/[id]/respond`)
  - If accepted: messaging thread (`POST /api/consultations/[id]/messages`)

### Quote Templates (`app/(app)/quote-templates/`)
- List of saved templates (`GET /api/quote-templates`)
- Create (`POST /api/quote-templates`): name, labor, materials, timeline, milestones, notes
- Edit (`PATCH /api/quote-templates/[id]`)
- Delete (`DELETE /api/quote-templates/[id]`)
- Max 20 templates — show count warning near limit

### Profile — Edit (`app/(app)/profile/index.tsx`)
- Avatar (image picker + upload)
- Bio / About text
- Years of experience
- Hourly rate
- Skills section (tag input, suggestions from `GET /api/skills?q=`)
- AI skill suggester (`POST /api/ai/suggest-skills` from bio text)
- PESO badges display (if referred by PESO office)

### Service Areas (`app/(app)/profile/service-areas.tsx`)
- Map view with pins for each saved area
- Add area: label + address + map pin (`POST /api/providers/profile/service-areas`)
- Delete area: swipe or trash icon (`DELETE /api/providers/profile/service-areas/[id]`)
- Max 10 areas — enforce client-side

### Notifications (`app/(app)/notifications/index.tsx`)
- Full list with type icons and read/unread state
- SSE stream: `GET /api/notifications/stream`
- Tap → navigate to linked screen
- Mark all read: `PATCH /api/notifications`

### Support Chat (`app/(app)/support/index.tsx`)
- Chat UI with admin
- Fetch history: `GET /api/support`
- Send: `POST /api/support`
- SSE stream: `GET /api/support/stream`

### Loyalty & Referrals (`app/(app)/loyalty/index.tsx`)
- Tier card: Bronze → Silver → Gold (with XP bar)
- Points balance + recent transactions (`GET /api/loyalty`)
- Referral code + share button (`GET /api/loyalty/referral`)
- "Refer a Provider" → deep link share

### Settings (`app/(app)/profile/settings.tsx`)
- Email notification toggle
- Push notification toggle
- Profile visibility: public / private
- Submit: `PUT /api/user/settings`
- Change password section
- Logout

---

## Shared Components to Build

| Component | Purpose |
|---|---|
| `JobCard` | Marketplace job listing item with tags + budget |
| `QuoteCard` | Submitted quote with status chip |
| `ClientCard` | Client mini-card |
| `ChatBubble` | Message bubble (sent / received) + attachment support |
| `StatusChip` | Color-coded job/quote status labels |
| `StarRating` | Display-only star rating |
| `TemplatePickerSheet` | Bottom sheet for selecting quote template |
| `MilestonesTable` | Add/edit/delete milestone rows in quote form |
| `EarningsCard` | Balance display with gradient |
| `NotificationBell` | Unread badge icon in header |
| `EmptyState` | Illustration + CTA for empty screens |
| `LoadingSkeleton` | Shimmer card placeholders |
| `AvatarPicker` | Image picker + upload |
| `ServiceAreaMap` | Map with draggable pins for service areas |
| `ApprovalGate` | Full-screen pending approval state |
| `AISuggestButton` | Inline AI assist button for forms |

---

## State Management (Zustand Stores)

```ts
// authStore: { user, setUser, clearUser }
// notificationStore: { notifications, unreadCount, markRead, markAllRead, connectSSE }
// earningsStore: light local cache for wallet balance (refresh on focus)
```

TanStack Query handles all server cache (jobs, quotes, transactions, templates).

---

## Real-time SSE Pattern

```ts
import EventSource from 'react-native-sse';

// Notifications
const es = new EventSource(`${API_URL}/api/notifications/stream`, {
  headers: { Cookie: sessionCookie },
});
es.addEventListener('message', (e) => {
  const n = JSON.parse(e.data);
  useNotificationStore.getState().add(n);
});

// Job chat
const chatEs = new EventSource(`${API_URL}/api/messages/stream/${threadId}`, {
  headers: { Cookie: sessionCookie },
});
chatEs.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  appendMessage(msg);
});
```

---

## Business Logic Notes

- **Commission**: LocalPro deducts 10% from each job payment. Providers see net amount in wallet.
  - Show both gross and net on earnings screens.
- **Escrow lifecycle**: Job must be `funded` (escrow deposited) before provider starts work. Escrow releases to provider wallet when client marks complete (or admin resolves dispute in provider's favor).
- **Quote expiry**: Quotes that are not accepted expire automatically (cron job on backend). Show expired state.
- **Provider approval gate**: Check `isApproved` field on profile on every app foreground. If false → redirect to `pending-approval.tsx`.
- **AI ranking**: Only meaningful when provider profile has skills + bio filled in. Prompt incomplete profile users to fill in details for better matches.
- **PESO priority jobs**: `isPriority: true` jobs appear at top of marketplace with an orange "Priority" ribbon. `jobTags` may include `"PESO"`, `"LGU"`, `"Emergency"` — render as colored chips.

---

## Deep Links

```
localpro-provider://verify-email?token=xxx
localpro-provider://reset-password?token=xxx
localpro-provider://jobs/[id]
localpro-provider://marketplace/[id]
localpro-provider://notifications
```

---

## Environment Variables (`.env`)

```
EXPO_PUBLIC_API_URL=https://your-localpro-domain.com
EXPO_PUBLIC_APP_NAME=LocalPro Provider
```

---

## Error Handling Convention

All API errors return `{ error: string, code?: string }`. Map:
- `401` → refresh token → retry → if still 401, logout
- `403` → "You don't have permission" toast + navigate back
- `404` → empty state component
- `422` → surface Zod field errors on the form
- `429` → "Too many requests" toast
- `500` → "Something went wrong" + retry button

---

## Code Style Rules

- TypeScript strict mode throughout
- All API calls in `/src/api/` (one file per domain: `jobs.ts`, `quotes.ts`, `earnings.ts`, `templates.ts`, etc.)
- No raw fetch in JSX — all data via TanStack Query hooks or service functions
- Forms: React Hook Form + Zod via `zodResolver`
- Styling: NativeWind v4 only — match web app's deep blue `primary` palette
- Reuse components — do not duplicate `ChatBubble`, `NotificationBell`, etc. across screens
- AI endpoints are optional enhancements — all flows must work without them (graceful fallback)
