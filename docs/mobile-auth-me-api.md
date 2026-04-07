# `/api/auth/me` — Mobile App API Guide

> All endpoints are session-protected via HttpOnly cookies.
> Mutating requests (`PUT`, `POST`, `PATCH`, `DELETE`) require an `x-csrf-token` header.
> Base URL: `https://<your-domain>`

---

## Table of Contents

1. [GET /api/auth/me](#1-get-apiauthme)
2. [PUT /api/auth/me](#2-put-apiauthme)
3. [POST /api/auth/me/avatar](#3-post-apiauthmeavatar)
4. [POST /api/auth/me/addresses](#4-post-apiauthmeaddresses)
5. [PATCH /api/auth/me/addresses/\[id\]](#5-patch-apiauthmeaddressesid)
6. [DELETE /api/auth/me/addresses/\[id\]](#6-delete-apiauthmeaddressesid)
7. [GET /api/auth/me/preferences](#7-get-apiauthmepreferences)
8. [PUT /api/auth/me/preferences](#8-put-apiauthmepreferences)
9. [Auth Store Pattern](#9-auth-store-pattern)
10. [CSRF Token](#10-csrf-token)

---

## 1. `GET /api/auth/me`

Load the authenticated user's profile. Call on app launch to check session and hydrate the auth store.

**Method:** `GET` · **Auth:** any authenticated user · **Body:** none

**Response `200`**
```json
{
  "_id": "6617a2f...",
  "name": "Juan dela Cruz",
  "email": "juan@example.com",
  "role": "provider",
  "isVerified": true,
  "isSuspended": false,
  "avatar": "https://res.cloudinary.com/...",
  "phone": "+639171234567",
  "kycStatus": "none | pending | approved | rejected",
  "accountType": "personal | business",
  "agencyId": "agencyId | null",
  "addresses": [
    {
      "_id": "...",
      "label": "Home",
      "address": "123 Rizal St, Quezon City",
      "isDefault": true,
      "coordinates": { "lat": 14.65, "lng": 121.03 }
    }
  ],
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

**Response `401`** — not authenticated → redirect to login

**Usage**
```ts
const res = await api.get('/api/auth/me');
if (res.status === 200) {
  authStore.setUser(res.data);
} else {
  authStore.clearUser(); // redirect to login
}
```

---

## 2. `PUT /api/auth/me`

Update name, phone, avatar URL, or password. All fields are optional — send only what changed.

**Method:** `PUT` · **Auth:** any · **Content-Type:** `application/json`  
**Headers:** `x-csrf-token: <token>`

**Request body**
```json
{
  "name": "Juan dela Cruz",
  "phone": "+639171234567",
  "avatar": "https://res.cloudinary.com/...",
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

**Field validation**

| Field | Rule |
|---|---|
| `name` | string, 2–100 chars |
| `phone` | E.164 format (`+639XXXXXXXXX`), or `null` to clear |
| `avatar` | must be a Cloudinary URL starting with `https://res.cloudinary.com/` |
| `newPassword` | string, 8–128 chars — requires `currentPassword` |

> **Note:** Use `POST /api/auth/me/avatar` for avatar uploads from the mobile app. This field only accepts an already-uploaded Cloudinary URL.

**Response `200`**
```json
{
  "_id": "...",
  "name": "Juan dela Cruz",
  "email": "juan@example.com",
  "role": "provider",
  "avatar": "https://res.cloudinary.com/...",
  "phone": "+639171234567",
  "createdAt": "..."
}
```

**Error responses**
```json
{ "error": "Phone must be in E.164 format (e.g. +639123456789)" }  // 400
{ "error": "Current password is required" }                         // 400
{ "error": "Current password is incorrect" }                        // 400
{ "error": "Invalid or missing CSRF token" }                        // 403
```

> **Password change** invalidates all existing sessions — the user must re-login on other devices.

---

## 3. `POST /api/auth/me/avatar`

Upload a new avatar image in a **single request**. Handles upload to Cloudinary, saves the URL to the user record, and deletes the old avatar — no second call needed.

**Method:** `POST` · **Auth:** any · **Content-Type:** `multipart/form-data`  
**Headers:** `x-csrf-token: <token>`

**Form fields**

| Field | Description |
|---|---|
| `file` | Image file — JPEG, PNG, or WEBP only, max **8 MB** |

**Response `200`**
```json
{ "avatar": "https://res.cloudinary.com/localpro/image/upload/avatars/abc123.jpg" }
```

**Error responses**
```json
{ "error": "No file provided" }                                      // 400
{ "error": "Only JPEG, PNG, and WEBP images are allowed" }           // 400
{ "error": "Image must be under 8 MB" }                              // 400
{ "error": "File content does not match its declared type" }          // 400
{ "error": "Invalid or missing CSRF token" }                          // 403
```

**React Native example**
```ts
import * as ImagePicker from 'expo-image-picker';

async function uploadAvatar() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled) return;

  const asset = result.assets[0];
  const form = new FormData();

  form.append('file', {
    uri: asset.uri,
    name: 'avatar.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  } as unknown as Blob);

  const res = await api.post('/api/auth/me/avatar', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'x-csrf-token': csrfToken,
    },
  });

  authStore.setUser({ ...authStore.user, avatar: res.data.avatar });
}
```

**What happens on the server**
1. Validates MIME type, file extension, size, and magic bytes
2. Uploads to Cloudinary `avatars/` folder (auto-resized to max 800×800, quality optimised)
3. Saves the new URL to `user.avatar`
4. Deletes the previous avatar from Cloudinary (non-blocking, best-effort)
5. Returns `{ avatar: url }`

---

## 4. `POST /api/auth/me/addresses`

Add a saved address. Maximum **10** per user. The first address added is automatically set as default.

**Method:** `POST` · **Auth:** any · **Content-Type:** `application/json`  
**Headers:** `x-csrf-token: <token>`

**Request body**
```json
{
  "label": "Home",
  "address": "123 Rizal St, Quezon City",
  "coordinates": { "lat": 14.65, "lng": 121.03 }
}
```

**Field validation**

| Field | Rule |
|---|---|
| `label` | string, 1–50 chars |
| `address` | string, 3–200 chars |
| `coordinates` | optional `{ lat: number, lng: number }` |

**Response `201`** — full updated `addresses` array

```json
[
  {
    "_id": "addr1",
    "label": "Home",
    "address": "123 Rizal St, Quezon City",
    "isDefault": true,
    "coordinates": { "lat": 14.65, "lng": 121.03 }
  }
]
```

> Always replace local address state with the full array returned — don't append manually.

**Error responses**
```json
{ "error": "Maximum 10 addresses allowed" }   // 422
{ "error": "label: Required" }                // 400
```

---

## 5. `PATCH /api/auth/me/addresses/[id]`

Update a saved address or set it as default. All fields are optional.

**Method:** `PATCH` · **Auth:** any · **Content-Type:** `application/json`  
**Headers:** `x-csrf-token: <token>`

**Request body** (all optional)
```json
{
  "label": "Office",
  "address": "456 Ayala Ave, Makati",
  "isDefault": true,
  "coordinates": { "lat": 14.55, "lng": 121.02 }
}
```

> Setting `isDefault: true` automatically clears the previous default — no need to update the old address separately.

**Response `200`** — full updated `addresses` array

**Error responses**
```json
{ "error": "Address not found" }    // 404
{ "error": "Invalid addressId" }    // 400
```

**Usage examples**
```ts
// Set as default
await api.patch(`/api/auth/me/addresses/${id}`, { isDefault: true });

// Edit label
await api.patch(`/api/auth/me/addresses/${id}`, { label: 'Work' });
```

---

## 6. `DELETE /api/auth/me/addresses/[id]`

Remove a saved address. If the deleted address was the default, the next remaining address is automatically promoted to default.

**Method:** `DELETE` · **Auth:** any · **Body:** none  
**Headers:** `x-csrf-token: <token>`

**Response `200`** — full updated `addresses` array (empty array `[]` if last address was deleted)

**Error responses**
```json
{ "error": "Address not found" }   // 404
```

---

## 7. `GET /api/auth/me/preferences`

Fetch granular per-channel, per-category notification preferences. Auto-seeds defaults (all enabled) on first call.

**Method:** `GET` · **Auth:** any · **Body:** none

**Response `200`**
```json
{
  "preferences": [
    { "channel": "email",  "category": "job_updates", "enabled": true },
    { "channel": "email",  "category": "messages",    "enabled": true },
    { "channel": "email",  "category": "payments",    "enabled": true },
    { "channel": "email",  "category": "reviews",     "enabled": true },
    { "channel": "email",  "category": "marketing",   "enabled": true },
    { "channel": "email",  "category": "system",      "enabled": true },
    { "channel": "push",   "category": "job_updates", "enabled": true },
    { "channel": "push",   "category": "messages",    "enabled": true },
    { "channel": "in_app", "category": "job_updates", "enabled": true }
  ]
}
```

**Channels**

| Value | Description |
|---|---|
| `email` | Email notifications |
| `push` | Push notifications (mobile) |
| `in_app` | In-app notification bell |

**Categories**

| Value | Examples |
|---|---|
| `job_updates` | Job approved, rejected, expired, started, completed |
| `messages` | New chat messages |
| `payments` | Escrow funded, released, withdrawal processed |
| `reviews` | New review received |
| `marketing` | Promotions, tips, announcements |
| `system` | Account alerts, KYC status, platform updates |

---

## 8. `PUT /api/auth/me/preferences`

Toggle a single channel + category preference.

**Method:** `PUT` · **Auth:** any · **Content-Type:** `application/json`  
**Headers:** `x-csrf-token: <token>`

**Request body**
```json
{
  "channel": "email",
  "category": "marketing",
  "enabled": false
}
```

**Response `200`**
```json
{
  "preference": {
    "channel": "email",
    "category": "marketing",
    "enabled": false
  }
}
```

**Usage example**
```ts
// Disable marketing emails
await api.put('/api/auth/me/preferences', {
  channel: 'email',
  category: 'marketing',
  enabled: false,
});

// Disable all push notifications
for (const category of CATEGORIES) {
  await api.put('/api/auth/me/preferences', {
    channel: 'push',
    category,
    enabled: false,
  });
}
```

---

## 9. Auth Store Pattern

Recommended Zustand store shape for React Native:

```ts
interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'client' | 'provider' | 'admin' | 'peso';
  isVerified: boolean;
  isSuspended: boolean;
  avatar: string | null;
  phone: string | null;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  accountType: 'personal' | 'business';
  agencyId: string | null;
  addresses: Address[];
  createdAt: string;
}

interface Address {
  _id: string;
  label: string;
  address: string;
  isDefault: boolean;
  coordinates?: { lat: number; lng: number };
}

// authStore.ts
const useAuthStore = create<{
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
  fetchMe: () => Promise<void>;
}>(/* ... */);
```

**App launch flow**
```ts
// _layout.tsx — root layout
useEffect(() => {
  authStore.fetchMe();       // GET /api/auth/me
}, []);

async function fetchMe() {
  try {
    const res = await api.get('/api/auth/me');
    authStore.setUser(res.data);
    router.replace('/(app)');
  } catch {
    authStore.clearUser();
    router.replace('/(auth)/login');
  }
}
```

---

## 10. CSRF Token

All mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) must include `x-csrf-token`.

**Get a CSRF token**
```
GET /api/auth/csrf
Response: { "token": "abc123...", "expiresAt": 1744000000 }
```

**Cache strategy** — fetch once, cache for the token lifetime, clear on `403`.

```ts
// csrfClient.ts
let cached: { token: string; expiresAt: number } | null = null;

async function getCsrfToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  const data = await res.json();
  cached = { token: data.token, expiresAt: data.expiresAt * 1000 };
  return cached.token;
}

// Axios interceptor
api.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase() ?? 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['x-csrf-token'] = await getCsrfToken();
  }
  return config;
});

// On 403 — clear cache and retry
api.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 403) {
    cached = null;
    // retry once with fresh token
  }
});
```

---

## Quick Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/me` | `GET` | Load current user + addresses |
| `/api/auth/me` | `PUT` | Update name / phone / password |
| `/api/auth/me/avatar` | `POST` | Upload & save avatar (multipart) |
| `/api/auth/me/addresses` | `POST` | Add saved address |
| `/api/auth/me/addresses/[id]` | `PATCH` | Update address / set default |
| `/api/auth/me/addresses/[id]` | `DELETE` | Remove address |
| `/api/auth/me/preferences` | `GET` | Get notification preferences |
| `/api/auth/me/preferences` | `PUT` | Toggle a preference |

---

*Last updated: 2026-04-08 — LocalPro Marketplace v1*
