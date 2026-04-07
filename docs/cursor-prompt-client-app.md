# Cursor Prompt — LocalPro Client Mobile App

> Paste this entire prompt into Cursor's composer when starting the React Native project.

---

## Project Overview

Build a **React Native mobile app (Expo SDK 52)** for the **Client** role of **LocalPro Marketplace** — a 3-sided service marketplace for the Philippines. Clients post service jobs, receive quotes from providers, fund escrow, and release payment after completion.

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
| Payments | `expo-web-browser` to open PayMongo checkout URL |
| Image upload | `expo-image-picker` + multipart POST |
| Maps | `react-native-maps` (optional, for job location pin) |
| Notifications | Expo Push Notifications (`expo-notifications`) |
| Storage | `expo-secure-store` for token refresh tracking |

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

1. **Splash** → check `GET /api/auth/me`. If 200 → go to Home. If 401 → go to Login.
2. **Login** → `POST /api/auth/login` → on success, server sets cookies → navigate to Home.
3. **Register** → `POST /api/auth/register` with `role: "client"` → prompt email verification.
4. **Phone login** → `POST /api/auth/phone/send` (OTP) → `POST /api/auth/phone/verify`.
5. **Logout** → `POST /api/auth/logout` → clear Zustand auth store → navigate to Login.
6. **Forgot password** → `POST /api/auth/forgot-password` → `POST /api/auth/reset-password`.
7. **Email verification** → `POST /api/auth/verify-email` with token from deep link.

Store auth user in Zustand: `{ id, name, email, role, avatar, isEmailVerified }`.

---

## Screen Map (Expo Router file structure)

```
app/
  _layout.tsx                  ← Root layout: QueryClient, Zustand hydration, auth guard
  (auth)/
    login.tsx
    register.tsx
    phone-login.tsx
    forgot-password.tsx
    reset-password.tsx          ← Deep link handler
    verify-email.tsx            ← Deep link handler
  (app)/
    _layout.tsx                 ← Tab navigator (Home, Jobs, Messages, Notifications, Profile)
    index.tsx                   ← Home / Dashboard
    jobs/
      index.tsx                 ← My Jobs list
      new.tsx                   ← Post a Job
      [id].tsx                  ← Job detail
      [id]/quotes.tsx           ← Quotes received for a job
      [id]/quote/[qid].tsx      ← Quote detail + accept action
      [id]/chat.tsx             ← Job messaging thread
      [id]/review.tsx           ← Leave a review (after completion)
      [id]/payment.tsx          ← Initiate escrow payment (PayMongo)
    providers/
      [id].tsx                  ← Provider public profile + reviews
    messages/
      index.tsx                 ← Message threads list
      [threadId].tsx            ← Chat window
    notifications/
      index.tsx                 ← Notification list
    support/
      index.tsx                 ← Support chat with admin
    search/
      index.tsx                 ← Search providers / jobs
    consultations/
      index.tsx                 ← My consultations list
      new.tsx                   ← Request a consultation
      [id].tsx                  ← Consultation detail + messages
    recurring/
      index.tsx                 ← Recurring schedules list
      [id].tsx                  ← Recurring schedule detail
    wallet/
      index.tsx                 ← Wallet balance + transaction history
    loyalty/
      index.tsx                 ← Points, tier, referral code
    profile/
      index.tsx                 ← View/edit own profile
      addresses.tsx             ← Saved addresses
      settings.tsx              ← Notification preferences
    announcements/
      index.tsx                 ← Platform announcements
```

---

## Key Screens — Spec

### Home / Dashboard (`app/(app)/index.tsx`)
- Greeting with user name + avatar
- Stats summary cards: Active Jobs, Pending Quotes, Wallet Balance
- Quick actions: "Post a Job", "Browse Providers", "My Messages"
- Recent announcements banner (`GET /api/announcements`)
- Active jobs mini-list (last 3 from `GET /api/jobs?status=active&limit=3`)

### Post a Job (`app/(app)/jobs/new.tsx`)
- Multi-step form (3 steps):
  1. **Details**: title, description, category picker (from `GET /api/categories`), tags
  2. **Location & Budget**: address input + map pin, budget range, AI budget estimate button (`POST /api/ai/estimate-budget`)
  3. **Review & Submit**: summary + submit → `POST /api/jobs`
- AI category auto-classify on description blur (`POST /api/ai/classify-category`)
- AI description generator (`POST /api/ai/generate-description`)
- On success → navigate to job detail

### My Jobs (`app/(app)/jobs/index.tsx`)
- Tab bar: All | Open | Active | Completed | Disputed
- Each job card: title, status chip (color-coded), budget, date, quote count
- Tap → Job detail
- Pull-to-refresh, infinite scroll (pagination from `GET /api/jobs`)

### Job Detail (`app/(app)/jobs/[id].tsx`)
- Job info: title, description, category, budget, location, status
- Action buttons depending on status:
  - `open` → View Quotes | Edit Job | Cancel Job
  - `quoted` → View Quotes (badge with count)
  - `accepted` → Fund Escrow (→ payment screen)
  - `active` → Chat with Provider | Mark Complete
  - `completed` → Leave Review | View Receipt
  - `disputed` → View Dispute
- Photo gallery (job photos)

### Quotes for a Job (`app/(app)/jobs/[id]/quotes.tsx`)
- List of submitted quotes (`GET /api/jobs/[id]/quotes`)
- Each quote card: provider name + avatar + rating, proposed amount, timeline, notes
- Tap → Quote detail
- Badge: "Best Match" on lowest price or highest rated

### Quote Detail (`app/(app)/jobs/[id]/quote/[qid].tsx`)
- Full quote breakdown: laborCost, materialsCost, milestones table, notes, proposal doc link
- Provider mini-profile (tap → provider profile page)
- Accept button → `POST /api/quotes/[id]/accept` → redirect to payment screen

### Escrow Payment (`app/(app)/jobs/[id]/payment.tsx`)
- Show job title, accepted amount, 10% platform fee breakdown
- "Pay via PayMongo" button → `POST /api/payments` with jobId → get `checkoutUrl`
- Open `checkoutUrl` via `expo-web-browser`
- Poll `GET /api/payments/[sessionId]?jobId=[id]` every 3 s after browser closes
- Show success / failed state

### Chat Window (`app/(app)/jobs/[id]/chat.tsx` and `app/(app)/messages/[threadId].tsx`)
- Messages list (newest at bottom), grouped by date
- SSE real-time via `GET /api/messages/stream/[threadId]`
- Text input + send button (`POST /api/messages/[threadId]`)
- Attach image button (`POST /api/messages/[threadId]/attachment`, multipart)
- Show read receipts, timestamps

### Leave Review (`app/(app)/jobs/[id]/review.tsx`)
- Star rating (overall 1-5)
- Breakdown sliders: quality, professionalism, punctuality, communication
- Text feedback area
- Submit → `POST /api/reviews`

### Notifications (`app/(app)/notifications/index.tsx`)
- Full notification list with unread badge
- SSE stream: `GET /api/notifications/stream`
- Mark all read: `PATCH /api/notifications`
- Tap notification → navigate to relevant screen

### Wallet (`app/(app)/wallet/index.tsx`)
- Balance card (PHP amount)
- Tabs: Transactions | Withdrawal Requests
- Transactions from `GET /api/transactions` (paginated)
- No withdrawal for clients (only providers), but show escrow holds

### Loyalty & Referrals (`app/(app)/loyalty/index.tsx`)
- Tier badge (Bronze / Silver / Gold)
- Points balance + history (`GET /api/loyalty`)
- Referral code card with share button (`GET /api/loyalty/referral`)
- Copy referral link action

### Provider Profile (`app/(app)/providers/[id].tsx`)
- Avatar, name, bio, rating, badge (PESO / verified)
- Skills, service areas
- Reviews list (`GET /api/providers/[id]/reviews`)
- "Add to Favorites" heart button (`POST /api/favorites`)
- "Request Consultation" button → consultation new screen

### Consultations (`app/(app)/consultations/`)
- List with status: pending, accepted, declined, completed
- Create: target provider, type (site inspection / chat), description, photos
- Detail shows provider response + estimate amount + messaging thread

### Recurring Schedules (`app/(app)/recurring/`)
- List of active / paused recurring bookings
- Detail: title, provider, next run date, runs remaining
- Controls: Pause / Resume / Cancel (`PATCH /api/recurring/[id]`)

### Support Chat (`app/(app)/support/index.tsx`)
- Chat UI with admin, SSE via `GET /api/support/stream`
- Send: `POST /api/support`
- Fetch history: `GET /api/support`

### Profile & Settings (`app/(app)/profile/`)
- Edit name, avatar (image picker + upload)
- Saved addresses (`GET/POST /api/auth/me/addresses`)
- Notification preferences (`GET/PUT /api/user/settings`)
- Change password
- Logout button

---

## Shared Components to Build

| Component | Purpose |
|---|---|
| `JobCard` | Reusable job list item with status chip |
| `QuoteCard` | Quote summary card |
| `ProviderCard` | Provider mini-card with rating stars |
| `ChatBubble` | Message bubble (sent / received variants) |
| `StatusChip` | Color-coded job status label |
| `StarRating` | Interactive + display-only star rating |
| `PayMongoButton` | Initiates checkout session, handles browser redirect |
| `NotificationBell` | Unread badge icon in header |
| `EmptyState` | Illustration + message for empty lists |
| `LoadingSkeleton` | Shimmer placeholder cards |
| `AvatarPicker` | Image picker + preview + upload |
| `ConfirmSheet` | Bottom sheet confirmation dialog |

---

## State Management (Zustand Stores)

```ts
// authStore: { user, setUser, clearUser }
// notificationStore: { notifications, unreadCount, markRead, markAllRead, connectSSE }
// jobStore: light cache only — TanStack Query is the primary cache
```

---

## Real-time SSE Pattern (React Native)

```ts
import EventSource from 'react-native-sse';

const es = new EventSource(`${API_URL}/api/notifications/stream`, {
  headers: { Cookie: await getSessionCookie() }, // if cookies aren't auto-sent
});
es.addEventListener('message', (e) => {
  const notif = JSON.parse(e.data);
  notificationStore.getState().addNotification(notif);
});
```

> Note: On iOS, cookies from WebKit (expo-web-browser) may not be shared with JS fetch. Use a session cookie bridging strategy or store the access token in SecureStore and send it as a Bearer header if the API supports it (confirm with backend team).

---

## Deep Links

Configure `expo-linking` for:
- `localpro://verify-email?token=xxx` → verify-email screen
- `localpro://reset-password?token=xxx` → reset-password screen
- `localpro://jobs/[id]` → job detail
- `localpro://payment-success?sessionId=xxx&jobId=xxx` → payment polling screen

---

## Environment Variables (`.env`)

```
EXPO_PUBLIC_API_URL=https://your-localpro-domain.com
EXPO_PUBLIC_APP_NAME=LocalPro
```

---

## Error Handling Convention

All API errors return `{ error: string, code?: string }`. Map common codes:
- `401` → trigger token refresh → retry
- `403` → show "Access denied" toast
- `404` → show "Not found" empty state
- `422` → surface Zod validation errors on form fields
- `429` → show "Too many requests, please slow down"
- `500` → show generic "Something went wrong" with retry button

---

## Code Style Rules

- TypeScript strict mode throughout
- All API calls in `/src/api/` service files (one file per domain: `jobs.ts`, `quotes.ts`, `payments.ts`, etc.)
- All screens in `app/` only import from components, hooks, stores, and api services — no raw fetch in JSX
- Use TanStack Query `useQuery` / `useMutation` for all server state
- Form validation with Zod schemas, hooked into React Hook Form via `zodResolver`
- NativeWind classes for all styling — no `StyleSheet.create` unless unavoidable
- No hardcoded colors — use NativeWind theme tokens matching the web app's `primary` (deep blue) palette
