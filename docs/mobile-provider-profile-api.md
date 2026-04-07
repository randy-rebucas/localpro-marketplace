# Provider Profile — Mobile App API Guide

> Covers every API call used by the Provider Profile screen and its sub-features.
> All requests require a valid session (HttpOnly cookie or Bearer token).
> Base URL: `https://<your-domain>`

---

## Table of Contents

1. [Data Models](#1-data-models)
2. [Load the Profile Screen](#2-load-the-profile-screen)
3. [Save Profile](#3-save-profile)
4. [Avatar Upload](#4-avatar-upload)
5. [Phone Number](#5-phone-number)
6. [Saved Addresses](#6-saved-addresses)
7. [Service Areas](#7-service-areas)
8. [AI — Generate Bio](#8-ai--generate-bio)
9. [AI — Suggest Skills](#9-ai--suggest-skills)
10. [KYC / Identity Verification](#10-kyc--identity-verification)
11. [Provider Boost](#11-provider-boost)
12. [Training & Certification](#12-training--certification)
13. [Public Profile View](#13-public-profile-view)
14. [Provider Tier System](#14-provider-tier-system)
15. [Full Screen Flow](#15-full-screen-flow)

---

## 1. Data Models

### ProviderProfile

```ts
interface ProviderProfile {
  _id: string;
  userId: string;

  // Editable fields
  bio: string;                        // max 1000 chars
  skills: Skill[];                    // max 20
  yearsExperience: number;            // 0–50
  hourlyRate?: number;                // PHP, positive
  availabilityStatus: "available" | "busy" | "unavailable";
  schedule: WeeklySchedule;
  portfolioItems: PortfolioItem[];    // max 10
  maxConcurrentJobs: number;          // 1–20

  // Computed / read-only
  avgRating: number;
  completedJobCount: number;
  completionRate: number;             // 0–100
  avgResponseTimeHours: number;
  isLocalProCertified: boolean;

  // Relational
  serviceAreas: ServiceArea[];        // max 10

  // PESO fields (read-only from provider side)
  barangay?: string;
  certifications?: PesoCertification[];
  pesoVerificationTags?: ("peso_registered" | "lgu_resident" | "peso_recommended")[];
  pesoReferredBy?: string;
  livelihoodProgram?: string;
  accountSubtype?: "standard" | "youth" | "cooperative";
  earnedBadges?: EarnedBadge[];

  createdAt: string;
  updatedAt: string;
}
```

### Supporting Types

```ts
interface Skill {
  skill: string;            // skill name
  yearsExperience: number;  // years in this skill
  hourlyRate: string;       // PHP rate for this specific skill (string, e.g. "500")
}

interface ServiceArea {
  _id: string;
  label: string;            // e.g. "Quezon City"
  address: string;
  coordinates?: { lat: number; lng: number };
}

interface WorkSlot {
  enabled: boolean;
  from: string;             // "HH:MM" 24-hour
  to: string;               // "HH:MM" 24-hour
}

type WeeklySchedule = {
  mon: WorkSlot; tue: WorkSlot; wed: WorkSlot; thu: WorkSlot;
  fri: WorkSlot; sat: WorkSlot; sun: WorkSlot;
};

interface PortfolioItem {
  title: string;            // max 100 chars
  description: string;      // max 500 chars
  imageUrl?: string;        // Cloudinary URL
}

interface Address {
  _id: string;
  label: string;            // "Home", "Office", etc.
  address: string;
  isDefault: boolean;
  coordinates?: { lat: number; lng: number };
}

interface EarnedBadge {
  badgeSlug: string;
  courseTitle: string;
  earnedAt: string;         // ISO date
}

interface PesoCertification {
  title: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string | null;
  verifiedByPeso?: boolean;
}
```

### Default Schedule (use as initial state)

```ts
const DEFAULT_SCHEDULE: WeeklySchedule = {
  mon: { enabled: true,  from: "08:00", to: "17:00" },
  tue: { enabled: true,  from: "08:00", to: "17:00" },
  wed: { enabled: true,  from: "08:00", to: "17:00" },
  thu: { enabled: true,  from: "08:00", to: "17:00" },
  fri: { enabled: true,  from: "08:00", to: "17:00" },
  sat: { enabled: false, from: "08:00", to: "12:00" },
  sun: { enabled: false, from: "08:00", to: "12:00" },
};
```

---

## 2. Load the Profile Screen

Make **two parallel requests** on mount — one for the provider profile, one for the current user (avatar, phone, addresses).

### `GET /api/providers/profile`

**Auth:** provider only

**Response `200`**
```json
{
  "_id": "...",
  "userId": "...",
  "bio": "Experienced plumber serving Metro Manila...",
  "skills": [
    { "skill": "Plumbing", "yearsExperience": 5, "hourlyRate": "500" }
  ],
  "yearsExperience": 5,
  "hourlyRate": 500,
  "availabilityStatus": "available",
  "schedule": {
    "mon": { "enabled": true, "from": "08:00", "to": "17:00" },
    "tue": { "enabled": true, "from": "08:00", "to": "17:00" },
    "wed": { "enabled": true, "from": "08:00", "to": "17:00" },
    "thu": { "enabled": true, "from": "08:00", "to": "17:00" },
    "fri": { "enabled": true, "from": "08:00", "to": "17:00" },
    "sat": { "enabled": false, "from": "08:00", "to": "12:00" },
    "sun": { "enabled": false, "from": "08:00", "to": "12:00" }
  },
  "portfolioItems": [],
  "serviceAreas": [
    { "_id": "...", "label": "Quezon City", "address": "Quezon City, Metro Manila", "coordinates": { "lat": 14.67, "lng": 121.04 } }
  ],
  "avgRating": 4.8,
  "completedJobCount": 23,
  "completionRate": 95,
  "avgResponseTimeHours": 1.2,
  "isLocalProCertified": false,
  "maxConcurrentJobs": 3,
  "earnedBadges": [],
  "certifications": [],
  "pesoVerificationTags": []
}
```

---

### `GET /api/auth/me`

**Auth:** any authenticated user

**Response `200`**
```json
{
  "_id": "...",
  "name": "Juan dela Cruz",
  "email": "juan@example.com",
  "phone": "+639171234567",
  "role": "provider",
  "avatar": "https://res.cloudinary.com/...",
  "isEmailVerified": true,
  "kycStatus": "none | pending | approved | rejected",
  "accountType": "personal | business",
  "addresses": [
    {
      "_id": "...",
      "label": "Home",
      "address": "123 Rizal St, Quezon City",
      "isDefault": true,
      "coordinates": { "lat": 14.65, "lng": 121.03 }
    }
  ]
}
```

**Implementation**

```ts
// Load both in parallel on screen mount
const [profileRes, meRes] = await Promise.all([
  api.get('/api/providers/profile'),
  api.get('/api/auth/me'),
]);
```

---

## 3. Save Profile

### `PUT /api/providers/profile`

**Auth:** provider only

Saves bio, skills, experience, availability, schedule, portfolio, and max jobs in a **single call**. The phone number is saved in a **separate** `PUT /api/auth/me` call — fire both in parallel.

**Request Body**
```json
{
  "bio": "Experienced plumber with 5 years...",
  "skills": [
    { "skill": "Plumbing", "yearsExperience": 5, "hourlyRate": "500" },
    { "skill": "Pipe Fitting", "yearsExperience": 3, "hourlyRate": "400" }
  ],
  "yearsExperience": 5,
  "hourlyRate": 500,
  "availabilityStatus": "available",
  "schedule": {
    "mon": { "enabled": true, "from": "08:00", "to": "17:00" },
    "tue": { "enabled": true, "from": "08:00", "to": "17:00" },
    "wed": { "enabled": true, "from": "08:00", "to": "17:00" },
    "thu": { "enabled": true, "from": "08:00", "to": "17:00" },
    "fri": { "enabled": true, "from": "08:00", "to": "17:00" },
    "sat": { "enabled": false, "from": "08:00", "to": "12:00" },
    "sun": { "enabled": false, "from": "08:00", "to": "12:00" }
  },
  "portfolioItems": [
    { "title": "Bathroom Renovation", "description": "Full pipe replacement job", "imageUrl": "https://res.cloudinary.com/..." }
  ],
  "maxConcurrentJobs": 3
}
```

**Validation Rules**

| Field | Rule |
|---|---|
| `bio` | string, max 1000 chars |
| `skills` | array, max 20 items |
| `skills[].skill` | string, required |
| `skills[].yearsExperience` | integer, 0–50 |
| `skills[].hourlyRate` | string (PHP amount or empty) |
| `yearsExperience` | integer, 0–50 |
| `hourlyRate` | positive number (PHP) |
| `availabilityStatus` | `"available"` \| `"busy"` \| `"unavailable"` |
| `schedule.*.from` / `.to` | `"HH:MM"` 24-hour format |
| `portfolioItems` | array, max 10 items |
| `portfolioItems[].title` | string, 1–100 chars |
| `portfolioItems[].description` | string, 1–500 chars |
| `maxConcurrentJobs` | integer, 1–20 |

**Response `200`** — full updated profile object (same shape as `GET /api/providers/profile`)

---

### `PUT /api/auth/me` — save phone number

Send in parallel with `PUT /api/providers/profile`.

**Request Body**
```json
{ "phone": "+639171234567" }
```

Validate phone format on the client before submitting. Use `libphonenumber-js` or equivalent. Pass `null` to clear the phone number.

**Response `200`**
```json
{ "_id": "...", "name": "...", "phone": "+639171234567", ... }
```

---

### Save Implementation (React Native example)

```ts
async function saveProfile(form: ProfileFormValues) {
  // Validate phone before firing
  if (form.phone && !isValidPhoneNumber(form.phone)) {
    throw new Error('Invalid phone number');
  }

  const [profileRes, phoneRes] = await Promise.all([
    api.put('/api/providers/profile', {
      bio: form.bio,
      skills: form.skills,
      yearsExperience: form.yearsExperience,
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      availabilityStatus: form.availabilityStatus,
      schedule: form.schedule,
      portfolioItems: form.portfolioItems,
      maxConcurrentJobs: form.maxConcurrentJobs,
    }),
    api.put('/api/auth/me', { phone: form.phone || null }),
  ]);

  return profileRes; // updated profile
}
```

---

## 4. Avatar Upload

Avatar upload is a **two-step process**: upload file → save URL to user record.

### Step 1 — `POST /api/upload`

Upload the image to Cloudinary via the server.

**Request:** `multipart/form-data`

| Field | Value |
|---|---|
| `file` | Image file (JPEG, PNG, or WEBP, max 8 MB) |
| `folder` | `"avatars"` |

**Response `200`**
```json
{
  "url": "https://res.cloudinary.com/localpro/image/upload/avatars/abc123.jpg",
  "publicId": "avatars/abc123",
  "format": "jpg",
  "bytes": 204800
}
```

**Errors**
- `400` — unsupported file type or extension
- `400` — file exceeds 10 MB limit
- `400` — invalid folder

---

### Step 2 — `PUT /api/auth/me`

Save the Cloudinary URL to the user's profile.

**Request Body**
```json
{ "avatar": "https://res.cloudinary.com/localpro/image/upload/avatars/abc123.jpg" }
```

**Response `200`** — updated user object with `avatar` field.

---

### Avatar Upload Implementation

```ts
async function uploadAvatar(imageFile: File) {
  // Step 1: upload to Cloudinary via server
  const form = new FormData();
  form.append('file', imageFile);
  form.append('folder', 'avatars');

  const uploadRes = await api.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const { url } = uploadRes.data;

  // Step 2: persist URL to user record
  const saveRes = await api.put('/api/auth/me', { avatar: url });
  return saveRes.data.avatar; // returns the Cloudinary URL
}
```

---

## 5. Phone Number

Phone is stored on the **User** record, not the ProviderProfile. Use `PUT /api/auth/me` (same call as the avatar update in Step 2 above).

```json
{ "phone": "+639171234567" }
```

- Format: E.164 (`+639XXXXXXXXX` for Philippines)
- Pass `null` to remove the phone number
- Validate client-side before sending using `libphonenumber-js`

---

## 6. Saved Addresses

Addresses belong to the **User** (not ProviderProfile). They represent the provider's physical locations.

### `POST /api/auth/me/addresses`

Add a new address. Maximum **10 addresses** per user.

**Request Body**
```json
{
  "label": "Home",
  "address": "123 Rizal St, Quezon City, Metro Manila",
  "coordinates": { "lat": 14.65, "lng": 121.03 }
}
```

**Validation**
- `label`: string, 1–50 chars (trim whitespace)
- `address`: string, 3–200 chars (trim whitespace)
- `coordinates`: optional `{ lat: number, lng: number }`

**Response `200`** — the full updated `addresses` array (not just the new item)

```json
[
  {
    "_id": "...",
    "label": "Home",
    "address": "123 Rizal St, Quezon City",
    "isDefault": true,
    "coordinates": { "lat": 14.65, "lng": 121.03 }
  }
]
```

---

### `PATCH /api/auth/me/addresses/[id]`

Update a saved address or mark it as default.

**Request Body** (all fields optional)
```json
{
  "label": "Office",
  "address": "456 Ayala Ave, Makati",
  "isDefault": true,
  "coordinates": { "lat": 14.55, "lng": 121.02 }
}
```

**Response `200`** — updated `addresses` array

> **Tip:** To set an address as default, send `{ "isDefault": true }` only. The server will unset the previous default automatically.

---

### `DELETE /api/auth/me/addresses/[id]`

Remove a saved address.

**Response `200`** — updated `addresses` array (without the deleted item)

---

### Address Implementation Pattern

```ts
// Add
const addresses = await api.post('/api/auth/me/addresses', {
  label: 'Home',
  address: '123 Rizal St',
  coordinates: { lat: 14.65, lng: 121.03 },
});

// Set as default
await api.patch(`/api/auth/me/addresses/${id}`, { isDefault: true });

// Delete
const addresses = await api.delete(`/api/auth/me/addresses/${id}`);
// response.data is the updated array
```

---

## 7. Service Areas

Service areas belong to **ProviderProfile** and define where the provider is willing to work. Maximum **10** per provider.

### `POST /api/providers/profile/service-areas`

**Request Body**
```json
{
  "label": "Quezon City",
  "address": "Quezon City, Metro Manila",
  "coordinates": { "lat": 14.67, "lng": 121.04 }
}
```

**Validation**
- `label`: string, 1–80 chars (trim)
- `address`: string, 2–200 chars (trim)
- `coordinates`: optional `{ lat: number, lng: number }`

**Response `201`** — full updated `serviceAreas` array

```json
[
  {
    "_id": "areaId1",
    "label": "Quezon City",
    "address": "Quezon City, Metro Manila",
    "coordinates": { "lat": 14.67, "lng": 121.04 }
  }
]
```

**Errors**
- `400` — maximum of 10 service areas already reached
- `422` — validation failed

---

### `DELETE /api/providers/profile/service-areas/[id]`

Remove a service area by its `_id`.

**Response `200`** — updated `serviceAreas` array

---

### Service Area Implementation Pattern

```ts
// Add
const areas = await api.post('/api/providers/profile/service-areas', {
  label: 'Quezon City',
  address: 'Quezon City, Metro Manila',
  coordinates: { lat: 14.67, lng: 121.04 },
});
// areas.data = updated serviceAreas array

// Delete
const areas = await api.delete(`/api/providers/profile/service-areas/${areaId}`);
// areas.data = updated serviceAreas array
```

---

## 8. AI — Generate Bio

Generates a 3–5 sentence professional bio using the provider's current skills, years of experience, and service areas as context.

### `POST /api/providers/profile/generate-bio`

**Auth:** provider only, **Gold tier or above required**

**Request Body:** none

**Response `200`**
```json
{
  "bio": "With over 5 years of hands-on plumbing experience across Quezon City and Caloocan, I specialize in pipe installation, leak repairs, and bathroom renovation. My clients value my reliability and transparency — I arrive on time, explain the work upfront, and don't leave until the job is done right. Whether it's a minor drip or a full system overhaul, I bring the same level of care to every project."
}
```

**Response `403`** — tier insufficient
```json
{
  "error": "AI features require Gold tier or above. You're currently Silver. Complete 10 more jobs to unlock.",
  "upgradeRequired": true,
  "currentTier": "silver",
  "requiredTier": "gold"
}
```

**Response `503`** — `OPENAI_API_KEY` not configured
```json
{ "error": "AI bio generation is not available right now." }
```

**UI Notes**
- Show the generated bio in the bio text area for review before saving
- The bio is **not** auto-saved — provider must tap "Save Profile" after reviewing
- Show a gold lock icon on the button if `currentTier` is below `gold`
- Disable the button while loading; show a spinner

---

## 9. AI — Suggest Skills

Returns up to 5 skill suggestions based on the current bio text. Filters out skills already added.

### `POST /api/ai/suggest-skills`

**Auth:** provider only, **Gold tier or above required**

**Request Body**
```json
{
  "bio": "Experienced plumber with 5 years serving Metro Manila...",
  "existingSkills": ["Plumbing", "Pipe Fitting"]
}
```

**Response `200`**
```json
{
  "skills": ["Drain Cleaning", "Water Heater Installation", "Leak Detection"]
}
```

**Auto-suggest Trigger (web behaviour to replicate in mobile)**

The web app auto-triggers this after the user stops typing in the bio field for 1.5 seconds, if:
1. Provider has AI access (Gold+ tier)
2. Bio is at least 50 characters
3. No suggestions already showing
4. Provider has fewer than 10 skills

In mobile, implement a debounced `useEffect` on bio input or a manual "Suggest Skills" button.

**Adding a Suggested Skill**

When the provider taps a suggestion chip, add it to the skills list with the current `yearsExperience` and `hourlyRate` as defaults:

```ts
function addSuggestedSkill(skillName: string) {
  setSkills(prev => [
    ...prev,
    {
      skill: skillName,
      yearsExperience: currentYearsExperience,
      hourlyRate: currentHourlyRate,
    }
  ]);
  setSuggestions(prev => prev.filter(s => s !== skillName));
}
```

---

## 10. KYC / Identity Verification

Providers submit identity documents to get a verified badge. Documents must be uploaded to Cloudinary first via `POST /api/upload`, then the Cloudinary URLs are submitted to the KYC endpoint.

### Step 1 — Upload Document

```
POST /api/upload
Content-Type: multipart/form-data
```

| Field | Value |
|---|---|
| `file` | PDF or image (JPEG, PNG, WEBP), max 10 MB |
| `folder` | `"kyc"` |

**Response `200`**
```json
{
  "url": "https://res.cloudinary.com/localpro/image/upload/kyc/doc123.jpg",
  "publicId": "kyc/doc123",
  "format": "jpg"
}
```

---

### Step 2 — Submit KYC Documents

### `POST /api/kyc`

**Auth:** any authenticated user (but typically providers)

**Request Body**
```json
{
  "documents": [
    {
      "type": "government_id",
      "url": "https://res.cloudinary.com/localpro/image/upload/kyc/id.jpg"
    },
    {
      "type": "selfie_with_id",
      "url": "https://res.cloudinary.com/localpro/image/upload/kyc/selfie.jpg"
    }
  ]
}
```

**Document Types**

| Type | Description |
|---|---|
| `government_id` | National ID, passport, driver's license |
| `tesda_certificate` | TESDA NC I / NC II certificate |
| `business_permit` | DTI / Mayor's permit |
| `selfie_with_id` | Photo of provider holding their ID |
| `other` | Any other supporting document |

**Validation**
- At least 1 document required
- `url` must be a Cloudinary URL (starts with `https://res.cloudinary.com/`)
- Submit multiple documents in a single call

**Response `200`**
```json
{ "kycStatus": "pending", "message": "KYC documents submitted. Under review." }
```

**After submission:**
- Admin is notified automatically
- Check `user.kycStatus` via `GET /api/auth/me` to track status: `none | pending | approved | rejected`
- When approved, `user.isVerified = true` and a verified badge appears on the profile

---

### KYC Status Display

| `kycStatus` | UI |
|---|---|
| `none` | "Verify your identity" CTA banner |
| `pending` | "Documents under review" chip (yellow) |
| `approved` | Verified badge ✓ (blue/green) |
| `rejected` | "Verification rejected" with reason + resubmit option |

---

## 11. Provider Boost

Boosts promote the provider on the platform. Deducted from wallet balance.

### `GET /api/provider/boost`

Returns active boosts, purchase history, current wallet balance, and current prices.

**Response `200`**
```json
{
  "activeBoosts": [
    {
      "_id": "boostId1",
      "type": "featured_provider",
      "startedAt": "2026-04-07T00:00:00Z",
      "expiresAt": "2026-04-14T00:00:00Z"
    }
  ],
  "history": [
    { "_id": "...", "type": "top_search", "expiresAt": "2026-03-31T00:00:00Z" }
  ],
  "balance": 5000,
  "prices": {
    "featured_provider": 299,
    "top_search": 199,
    "homepage_highlight": 499
  }
}
```

---

### `POST /api/provider/boost`

Purchase a boost. Deducted from wallet.

**Request Body**
```json
{
  "type": "featured_provider | top_search | homepage_highlight",
  "payWith": "wallet | paymongo"
}
```

- `payWith: "wallet"` — deducted immediately from wallet balance
- `payWith: "paymongo"` — returns a `checkoutUrl` to redirect the provider

**Response `201`** (wallet payment)
```json
{
  "boost": {
    "_id": "...",
    "type": "featured_provider",
    "expiresAt": "2026-04-14T00:00:00Z"
  },
  "newBalance": 4701
}
```

**Response `201`** (PayMongo payment)
```json
{
  "checkoutUrl": "https://checkout.paymongo.com/...",
  "sessionId": "cs_..."
}
```

**Errors**
- `400` — invalid boost type
- `422` — insufficient wallet balance (when `payWith: "wallet"`)

---

### `DELETE /api/provider/boost/[id]`

Cancel an active boost. **No refund is issued.**

**Response `200`**
```json
{ "message": "Boost cancelled" }
```

---

### Boost Type Descriptions

| Type | Where it appears | Duration |
|---|---|---|
| `featured_provider` | Featured section on provider browse page | 7 days |
| `top_search` | Top of search results | 7 days |
| `homepage_highlight` | Homepage featured providers widget | 7 days |

---

## 12. Training & Certification

Providers complete training courses to earn badges and improve their tier.

### `GET /api/provider/training`

List all published courses with enrollment status.

**Query:** `category` (optional filter)

**Response `200`**
```json
{
  "courses": [
    {
      "_id": "courseId1",
      "title": "Professional Plumbing Fundamentals",
      "category": "technical",
      "description": "...",
      "price": 0,
      "durationMinutes": 120,
      "badgeSlug": "plumbing-fundamentals",
      "enrolled": false,
      "progress": 0,
      "completedAt": null
    }
  ]
}
```

---

### `GET /api/provider/training/[id]`

Get course details. Lesson content is only included if enrolled.

**Response `200`**
```json
{
  "course": {
    "_id": "courseId1",
    "title": "Professional Plumbing Fundamentals",
    "lessons": [
      { "_id": "lessonId1", "title": "Tools & Safety", "durationMinutes": 15 }
    ],
    "enrolled": false,
    "progress": 0
  }
}
```

---

### `POST /api/provider/training/[id]/enroll`

Enroll in a course (deducted from wallet for paid courses, free for ₱0 courses).

**Request Body:** none

**Response `201`**
```json
{
  "enrollment": {
    "_id": "enrollId1",
    "courseId": "courseId1",
    "status": "enrolled",
    "progress": 0,
    "completedAt": null
  }
}
```

---

### `POST /api/provider/training/[id]/checkout`

For paid courses — create a PayMongo checkout session.

**Response `201`**
```json
{
  "checkoutUrl": "https://checkout.paymongo.com/...",
  "sessionId": "cs_..."
}
```

---

### `GET /api/provider/training/enrollments`

List all enrollments for the provider.

**Response `200`**
```json
{
  "enrollments": [
    {
      "_id": "enrollId1",
      "courseId": "courseId1",
      "status": "enrolled | completed",
      "progress": 75,
      "completedAt": null
    }
  ]
}
```

---

### `POST /api/provider/training/enrollments/[enrollmentId]/lessons/[lessonId]/complete`

Mark a lesson as completed. Updates progress %.

**Response `200`** — updated enrollment with new `progress`.

---

### `GET /api/provider/training/[id]/certificate`

Get certificate data for a completed course. Use this to render a certificate card.

**Response `200`**
```json
{
  "providerName": "Juan dela Cruz",
  "courseTitle": "Professional Plumbing Fundamentals",
  "category": "technical",
  "badgeSlug": "plumbing-fundamentals",
  "completedAt": "2026-04-07T10:00:00Z",
  "certificateNumber": "LP-A1B2C3D4"
}
```

**Response `403`** — course not completed yet

---

## 13. Public Profile View

Used when a client taps on a provider's name or card. No auth required.

### `GET /api/providers/[id]/profile`

Fetches the public profile with review breakdown and 5-star streak.

**Response `200`**
```json
{
  "_id": "...",
  "userId": "...",
  "bio": "...",
  "skills": [...],
  "yearsExperience": 5,
  "hourlyRate": 500,
  "availabilityStatus": "available",
  "portfolioItems": [...],
  "serviceAreas": [...],
  "avgRating": 4.8,
  "completedJobCount": 23,
  "completionRate": 95,
  "isLocalProCertified": true,
  "earnedBadges": [
    { "badgeSlug": "plumbing-fundamentals", "courseTitle": "...", "earnedAt": "..." }
  ],
  "pesoVerificationTags": ["peso_registered"],
  "breakdown": {
    "quality": 4.9,
    "professionalism": 4.8,
    "punctuality": 4.7,
    "communication": 4.8
  },
  "streak": 7
}
```

- `breakdown` — average scores per review category
- `streak` — count of consecutive 5-star reviews

---

### `GET /api/providers/[id]/reviews`

Paginated reviews for the provider.

**Query:** `page` (default `1`), `limit` (default `10`, max `20`)

**Response `200`**
```json
{
  "reviews": [
    {
      "_id": "...",
      "clientId": { "_id": "...", "name": "Maria Santos", "avatar": "..." },
      "jobId": "...",
      "rating": 5,
      "feedback": "Excellent work, very professional!",
      "breakdown": { "quality": 5, "professionalism": 5, "punctuality": 5, "communication": 5 },
      "response": "Thank you for the kind words!",
      "createdAt": "2026-04-01T10:00:00Z"
    }
  ],
  "total": 23,
  "page": 1,
  "limit": 10
}
```

---

### Share Profile URL

The provider's public share URL is:
```
https://<your-domain>/providers/<userId>
```

Use `Share` API (React Native `Share.share()`) or clipboard copy.

---

## 14. Provider Tier System

The tier is computed client-side from `completedJobCount`, `avgRating`, and `completionRate`. Use this to gate AI features.

```ts
function getProviderTier(
  completedJobCount: number,
  avgRating: number,
  completionRate: number
): ProviderTier {
  // Bronze: default starting tier
  // Silver: 5+ jobs, rating >= 4.0, completion >= 80%
  // Gold:   15+ jobs, rating >= 4.5, completion >= 90%
  // Platinum: 50+ jobs, rating >= 4.8, completion >= 95%
}

interface ProviderTier {
  tier: "bronze" | "silver" | "gold" | "platinum";
  label: string;          // "Bronze", "Silver", "Gold", "Platinum"
  hasAIAccess: boolean;   // true for Gold+
  nextMsg: string;        // "Complete X more jobs to unlock Gold"
}
```

**AI features (Gold+ only)**
- `POST /api/providers/profile/generate-bio`
- `POST /api/ai/suggest-skills`
- `POST /api/ai/suggest-replies`
- `POST /api/ai/generate-quote-message`

**Display tier badges on profile:**

| Tier | Badge color |
|---|---|
| Bronze | `#cd7f32` |
| Silver | `#9E9E9E` |
| Gold | `#FFD700` |
| Platinum | `#E5E4E2` |

---

## 15. Full Screen Flow

```
Screen mount
├── GET /api/providers/profile     → initialize form state
├── GET /api/auth/me               → avatar, phone, addresses, kycStatus
│
├── [User edits bio]
│   └── Auto-trigger POST /api/ai/suggest-skills (debounced 1.5s, Gold+ only)
│
├── [User taps "Generate Bio"]
│   └── POST /api/providers/profile/generate-bio → set bio field
│
├── [User adds address]
│   └── POST /api/auth/me/addresses
│
├── [User sets default address]
│   └── PATCH /api/auth/me/addresses/[id] { isDefault: true }
│
├── [User deletes address]
│   └── DELETE /api/auth/me/addresses/[id]
│
├── [User adds service area]
│   └── POST /api/providers/profile/service-areas
│
├── [User removes service area]
│   └── DELETE /api/providers/profile/service-areas/[id]
│
├── [User changes avatar]
│   ├── POST /api/upload (folder: "avatars") → get Cloudinary URL
│   └── PUT /api/auth/me { avatar: url }
│
├── [User taps "Save"]
│   ├── PUT /api/providers/profile  (profile fields)
│   └── PUT /api/auth/me           (phone number) — parallel
│
├── [User submits KYC]
│   ├── POST /api/upload (folder: "kyc") × n documents → get URLs
│   └── POST /api/kyc { documents: [...] }
│
└── [User views Boost / Training tabs]
    ├── GET /api/provider/boost
    └── GET /api/provider/training
```

---

## Error Handling Reference

| Status | Meaning | UI action |
|---|---|---|
| `400` | Validation failed (field error) | Show field-level error |
| `401` | Session expired | Redirect to login |
| `403` | Role/tier insufficient | Show upgrade prompt or lock icon |
| `404` | Resource not found | Show empty state |
| `422` | Business rule violated (e.g. max 10 areas) | Show toast with `error` message |
| `503` | AI service unavailable | Show "Feature unavailable" message |

All error responses follow:
```json
{ "error": "Human-readable message" }
```

---

*Last updated: 2026-04-07 — LocalPro Marketplace v1*
