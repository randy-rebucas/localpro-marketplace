# Provider Training Module - Mobile App Implementation Guide

## Overview

The Provider Training Module enables providers to upskill through structured courses with video/image lessons, earn badges upon completion, and access certificates. The system supports both free and paid courses with dual payment methods (wallet and PayMongo credit card).

**Key Features:**
- Browse and filter training courses by category
- Enroll via wallet balance or PayMongo checkout
- Track lesson progress with visual indicators
- Earn badges and certificates upon course completion
- View and download earned certificates

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Data Models & Types](#data-models--types)
3. [Authentication & Authorization](#authentication--authorization)
4. [User Flows](#user-flows)
5. [Payment Integration](#payment-integration)
6. [Badge & Certificate System](#badge--certificate-system)
7. [Mobile UI/UX Guidelines](#mobile-uiux-guidelines)
8. [Error Handling](#error-handling)
9. [Implementation Checklist](#implementation-checklist)

---

## API Endpoints

### Base URL
```
https://localpro-marketplace.vercel.app/api/provider/training
```

All endpoints require authentication. Include the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

### 1. List All Courses

**Endpoint:** `GET /api/provider/training`

**Query Parameters:**
- `category` (optional): Filter by category. Values: `"basic"`, `"advanced"`, `"safety"`, `"custom"`, `"certification"`. If omitted, returns all published courses.

**Response: 200 OK**
```json
{
  "courses": [
    {
      "_id": "courseId1",
      "title": "Professional Plumbing Fundamentals",
      "slug": "plumbing-fundamentals",
      "description": "Learn essential plumbing tools, safety protocols, and common repairs.",
      "category": "basic",
      "price": 0,
      "durationMinutes": 120,
      "badgeSlug": "plumbing-fundamentals",
      "enrollmentCount": 45,
      "lessons": [
        {
          "_id": "lessonId1",
          "title": "Tools & Safety",
          "durationMinutes": 15,
          "order": 1
        }
      ],
      "enrolled": false,
      "enrollmentStatus": null,
      "completedLessonsCount": 0
    },
    {
      "_id": "courseId2",
      "title": "Advanced Electrical Systems",
      "slug": "advanced-electrical",
      "description": "Master advanced wiring, circuit breakers, and troubleshooting.",
      "category": "advanced",
      "price": 1500,
      "durationMinutes": 240,
      "badgeSlug": "advanced-electrical",
      "enrollmentCount": 12,
      "lessons": [
        {
          "_id": "lessonId5",
          "title": "AC Systems",
          "durationMinutes": 60,
          "order": 1
        }
      ],
      "enrolled": true,
      "enrollmentStatus": "enrolled",
      "completedLessonsCount": 2
    }
  ]
}
```

**Response: 401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**Mobile Implementation Notes:**
- Display courses in grid/list layout with category badges
- Show preview: title, category, duration, price, enrollment count
- Indicate if already enrolled or completed with visual badge
- Implement horizontal scrollable category filter tabs
- Show "Free" for ₱0 courses; show "₱X" for paid courses

---

### 2. Get Course Details

**Endpoint:** `GET /api/provider/training/[id]`

**Path Parameters:**
- `id`: Course MongoDB ObjectId (e.g., `6789abcdef0123456789abcd`)

**Lesson Content Access:**
- Full lesson content (markdown, video URL, images) is **only returned if `enrolled: true`**
- Non-enrolled providers see lesson titles and durations only

**Response: 200 OK** (Enrolled Provider)
```json
{
  "course": {
    "_id": "courseId1",
    "title": "Professional Plumbing Fundamentals",
    "slug": "plumbing-fundamentals",
    "description": "Learn essential plumbing tools, safety protocols, and common repairs.",
    "category": "basic",
    "price": 0,
    "durationMinutes": 120,
    "badgeSlug": "plumbing-fundamentals",
    "lessons": [
      {
        "_id": "lessonId1",
        "title": "Tools & Safety",
        "content": "# Lesson 1: Tools & Safety\n\nEssential tools include...",
        "durationMinutes": 15,
        "order": 1,
        "videoUrl": "https://youtube.com/embed/abc123",
        "imageUrl": "https://cdn.localpro.com/courses/plumbing/tools.jpg"
      },
      {
        "_id": "lessonId2",
        "title": "Basic Repairs",
        "content": "# Lesson 2: Basic Repairs\n\nLearn to fix common issues...",
        "durationMinutes": 25,
        "order": 2,
        "videoUrl": "https://youtube.com/embed/def456",
        "imageUrl": null
      }
    ],
    "enrollment": {
      "_id": "enrollmentId1",
      "status": "enrolled",
      "completedLessons": ["lessonId1"],
      "completedAt": null,
      "badgeGranted": false
    }
  }
}
```

**Response: 200 OK** (Non-Enrolled Provider)
```json
{
  "course": {
    "_id": "courseId1",
    "title": "Professional Plumbing Fundamentals",
    "slug": "plumbing-fundamentals",
    "description": "Learn essential plumbing tools, safety protocols, and common repairs.",
    "category": "basic",
    "price": 0,
    "durationMinutes": 120,
    "badgeSlug": "plumbing-fundamentals",
    "lessons": [
      {
        "_id": "lessonId1",
        "title": "Tools & Safety",
        "durationMinutes": 15,
        "order": 1
      },
      {
        "_id": "lessonId2",
        "title": "Basic Repairs",
        "durationMinutes": 25,
        "order": 2
      }
    ],
    "enrollment": null
  }
}
```

**Response: 404 Not Found**
```json
{
  "error": "Course not found"
}
```

**Mobile Implementation Notes:**
- Show course overview: title, category, duration, price, description
- Display lesson list with lock icons for non-enrolled
- Show visible progress bar if enrolled (e.g., "2 of 5 lessons completed")
- Video/image content only rendered if `enrollment` is present
- Use markdown renderer for `content` field (sanitize HTML)
- Show action buttons: "Enroll Now" (if not enrolled) or "Continue Learning" (if enrolled)

---

### 3. Enroll Using Wallet

**Endpoint:** `POST /api/provider/training/[id]/enroll`

**Path Parameters:**
- `id`: Course MongoDB ObjectId

**Request Body:**
```json
{}
```
(No body required)

**Response: 201 Created** (Success)
```json
{
  "activated": true,
  "enrollment": {
    "_id": "enrollmentId1",
    "providerId": "userId1",
    "courseId": "courseId1",
    "courseTitle": "Professional Plumbing Fundamentals",
    "amountPaid": 0,
    "status": "enrolled",
    "completedLessons": [],
    "badgeGranted": false,
    "walletTxId": "txId1",
    "createdAt": "2026-04-08T10:30:00.000Z",
    "updatedAt": "2026-04-08T10:30:00.000Z"
  }
}
```

**Response: 402 Payment Required** (Insufficient Wallet Balance)
```json
{
  "activated": false,
  "error": "Insufficient wallet balance. Current balance: ₱500, Course cost: ₱1500"
}
```

**Response: 409 Conflict** (Already Enrolled)
```json
{
  "error": "Already enrolled in this course"
}
```

**Response: 422 Unprocessable Entity** (Course Not Published)
```json
{
  "error": "Course is not available for enrollment"
}
```

**Business Logic:**
1. Validates provider role (must be a provider)
2. Validates course is published
3. Checks for existing enrollment (prevents duplicates)
4. Verifies wallet has sufficient balance
5. Debits wallet amount immediately
6. Creates enrollment with `status: "enrolled"`, `completedLessons: []`
7. Sends in-app notification: "Enrollment confirmed! ₱X was deducted from your wallet"
8. Immediate access to lessons

**Mobile Implementation Notes:**
- Show confirmation dialog for paid courses: "Enroll for ₱500 from your wallet?"
- Handle insufficient balance gracefully—suggest PayMongo as fallback
- Disable button during request with loading spinner
- Show success toast and navigate to course player
- If free course, enroll immediately without confirmation

---

### 4. Initiate PayMongo Checkout

**Endpoint:** `POST /api/provider/training/[id]/checkout`

**Path Parameters:**
- `id`: Course MongoDB ObjectId

**Request Body:**
```json
{}
```
(No body required)

**Response: 201 Created**
```json
{
  "activated": false,
  "checkoutUrl": "https://checkout.paymongo.com/pay/cms_xxxxxxxxx",
  "checkoutSessionId": "cs_test_2bwxxxxxxxxxxxxc15"
}
```

**Response: 422 Unprocessable Entity** (PayMongo Not Configured)
```json
{
  "error": "Payment gateway is not available. Please try wallet enrollment."
}
```

**Response: 409 Conflict** (Already Enrolled)
```json
{
  "error": "Already enrolled in this course"
}
```

**Business Logic:**
1. Creates PayMongo checkout session with course price
2. Session metadata includes: `{ type: "training", courseId, providerId, amountPHP }`
3. Returns hosted checkout URL (provider redirects to this)
4. Returns `checkoutSessionId` for backend verification after payment

**Mobile Implementation Notes:**
- Open checkout URL in in-app browser or external browser
- Store `checkoutSessionId` in local storage or app state
- **Critical:** Save `checkoutSessionId` before redirecting (needed for activation)
- After payment, user is redirected with URL params: `?payment=success` or `?payment=cancelled`
- Handle both success and cancellation gracefully

---

### 5. Activate Enrollment After Payment

**Endpoint:** `POST /api/provider/training/[id]/activate`

**Path Parameters:**
- `id`: Course MongoDB ObjectId

**Request Body:**
```json
{
  "sessionId": "cs_test_2bwxxxxxxxxxxxxc15"
}
```

**Response: 200 OK** (Payment Verified & Enrolled)
```json
{
  "activated": true,
  "enrollment": {
    "_id": "enrollmentId1",
    "providerId": "userId1",
    "courseId": "courseId1",
    "courseTitle": "Professional Plumbing Fundamentals",
    "amountPaid": 1500,
    "status": "enrolled",
    "completedLessons": [],
    "badgeGranted": false,
    "paymongoSessionId": "cs_test_2bwxxxxxxxxxxxxc15",
    "createdAt": "2026-04-08T10:30:00.000Z",
    "updatedAt": "2026-04-08T10:30:00.000Z"
  }
}
```

**Response: 200 OK** (Already Activated by Webhook)
```json
{
  "activated": true
}
```

**Response: 402 Payment Required** (Payment Not Completed)
```json
{
  "error": "Payment not received or session expired"
}
```

**Response: 409 Conflict** (Already Enrolled Before)
```json
{
  "error": "Already enrolled in this course"
}
```

**Business Logic:**
1. **Idempotent:** Safe to call multiple times
2. Queries PayMongo API with `sessionId` to verify payment succeeded
3. If payment confirmed, creates enrollment record (or confirms existing one from webhook)
4. Posts ledger journal entry to accounting system
5. Sends notification: "Enrollment confirmed! You're now enrolled in [Course Title]"
6. **Concurrent webhook call:** Backend webhook may activate simultaneously—both calls handle race conditions

**Critical for Mobile:**
- **Session Storage:** Save `sessionId` before checkout redirect
```javascript
// Before redirecting to PayMongo
sessionStorage.setItem(`training_session_${courseId}`, checkoutSessionId);
// After redirect back, retrieve and activate
const sessionId = sessionStorage.getItem(`training_session_${courseId}`);
await POST `/api/provider/training/${courseId}/activate` { sessionId }
```

- **Fallback Polling:** If activation fails, poll course endpoint periodically (every 3-5 seconds, max 8 attempts) to catch webhook activation
- Show loading banner: "Activating your enrollment… This may take a few seconds"

---

### 6. Mark Lesson as Complete

**Endpoint:** `POST /api/provider/training/enrollments/[enrollmentId]/lessons/[lessonId]/complete`

**Path Parameters:**
- `enrollmentId`: Enrollment MongoDB ObjectId (e.g., `6789abcdef0123456789abcd`)
- `lessonId`: Lesson MongoDB ObjectId from course lessons array

**Request Body:**
```json
{}
```
(No body required)

**Response: 200 OK**
```json
{
  "enrollment": {
    "_id": "enrollmentId1",
    "providerId": "userId1",
    "courseId": "courseId1",
    "courseTitle": "Professional Plumbing Fundamentals",
    "amountPaid": 0,
    "status": "enrolled",
    "completedLessons": ["lessonId1", "lessonId2"],
    "badgeGranted": false,
    "createdAt": "2026-04-08T10:30:00.000Z",
    "updatedAt": "2026-04-08T10:31:00.000Z"
  }
}
```

**Response: 403 Forbidden** (Not Enrolled)
```json
{
  "error": "You are not enrolled in this course"
}
```

**Response: 422 Unprocessable Entity** (Course Already Completed)
```json
{
  "error": "This course is already completed"
}
```

**Response: 404 Not Found**
```json
{
  "error": "Lesson not found in this course"
}
```

**Business Logic:**
1. Validates provider owns enrollment
2. Prevents marking lessons complete if course already completed
3. Adds `lessonId` to `completedLessons` array (no duplicates via MongoDB `$addToSet`)
4. Progress percentage auto-calculated on frontend: `(completedLessons.length / totalLessons.length) * 100`
5. Updates `updatedAt` timestamp

**Mobile Implementation Notes:**
- Call on lesson completion (e.g., when user clicks "Mark Complete" button)
- Update UI immediately with optimistic update
- Show toast: "Lesson completed!"
- Auto-advance to next incomplete lesson
- Update progress bar in real-time

---

### 7. Complete Course & Claim Badge

**Endpoint:** `POST /api/provider/training/enrollments/[enrollmentId]/complete`

**Path Parameters:**
- `enrollmentId`: Enrollment MongoDB ObjectId

**Request Body:**
```json
{}
```
(No body required)

**Prerequisites:**
- All lessons must be marked complete
- Course enrollment must have `status: "enrolled"`

**Response: 200 OK**
```json
{
  "enrollment": {
    "_id": "enrollmentId1",
    "providerId": "userId1",
    "courseId": "courseId1",
    "courseTitle": "Professional Plumbing Fundamentals",
    "amountPaid": 0,
    "status": "completed",
    "completedLessons": ["lessonId1", "lessonId2"],
    "completedAt": "2026-04-08T10:45:00.000Z",
    "badgeGranted": true,
    "createdAt": "2026-04-08T10:30:00.000Z",
    "updatedAt": "2026-04-08T10:45:00.000Z"
  }
}
```

**Response: 403 Forbidden** (Not Enrolled)
```json
{
  "error": "You are not enrolled in this course"
}
```

**Response: 422 Unprocessable Entity** (Incomplete Lessons)
```json
{
  "error": "You must complete all lessons before claiming your badge"
}
```

**Response: 409 Conflict** (Already Completed)
```json
{
  "error": "This course is already completed"
}
```

**Business Logic:**
1. Validates all lessons completed (must have `completedLessons.length === totalLessons`)
2. Validates course not already completed
3. Updates enrollment: `status: "completed"`, `completedAt: now()`, `badgeGranted: true`
4. **Grants badge** to provider's profile (added to `ProviderProfile.earnedBadges` array)
5. Sends notification: "🎓 Course completed! You've earned your badge"
6. Badge data stored includes: `{ badgeSlug, courseTitle, earnedAt }`

**Mobile Implementation Notes:**
- Show "Claim Badge & Complete" button only when all lessons are done
- Show celebratory animation/confetti on completion
- Display earned badge info popup
- Offer option to "Download Certificate" immediately after completion
- Show notification: "🎓 Badge earned!"

---

### 8. Get my Enrollments

**Endpoint:** `GET /api/provider/training/enrollments`

**Response: 200 OK**
```json
{
  "enrollments": [
    {
      "_id": "enrollmentId1",
      "providerId": "userId1",
      "courseId": {
        "_id": "courseId1",
        "title": "Professional Plumbing Fundamentals",
        "slug": "plumbing-fundamentals",
        "category": "basic",
        "badgeSlug": "plumbing-fundamentals",
        "durationMinutes": 120,
        "lessons": [
          {
            "_id": "lessonId1",
            "title": "Tools & Safety",
            "durationMinutes": 15,
            "order": 1
          },
          {
            "_id": "lessonId2",
            "title": "Basic Repairs",
            "durationMinutes": 25,
            "order": 2
          }
        ]
      },
      "courseTitle": "Professional Plumbing Fundamentals",
      "amountPaid": 0,
      "status": "enrolled",
      "completedLessons": ["lessonId1"],
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:35:00.000Z"
    }
  ]
}
```

**Mobile Implementation Notes:**
- Use to populate "My Courses" section
- Display in two groups: "In Progress" and "Completed"
- Show progress bar for in-progress courses
- Show badge icon for completed courses

---

### 9. Get Certificate Data

**Endpoint:** `GET /api/provider/training/[id]/certificate`

**Path Parameters:**
- `id`: Course MongoDB ObjectId

**Prerequisites:**
- Course must be published
- Enrollment must exist with `status: "completed"`

**Response: 200 OK**
```json
{
  "providerName": "Juan dela Cruz",
  "courseTitle": "Professional Plumbing Fundamentals",
  "category": "basic",
  "badgeSlug": "plumbing-fundamentals",
  "completedAt": "2026-04-08T10:45:00.000Z",
  "certificateNumber": "LP-ABCD1234"
}
```

**Response: 403 Forbidden** (Course Not Completed)
```json
{
  "error": "You have not completed this course"
}
```

**Response: 404 Not Found** (Course/Enrollment Not Found)
```json
{
  "error": "Certificate not found"
}
```

**Certificate Number Format:**
- Generated as: `LP-${enrollmentId.slice(-8).toUpperCase()}`
- Example: `LP-6789ABCD`
- Unique per enrollment, never changes

**Mobile Implementation Notes:**
- Render certificate as printable/shareable PDF or image on mobile
- Display: Provider name, course title, badge icon, completion date, certificate number
- Provide "Download" and "Share" options
- Can be accessed anytime after course completion

---

## Data Models & Types

### Course Categories
```typescript
type CourseCategory = "basic" | "advanced" | "safety" | "custom" | "certification"

// Label mapping for UI
"basic" → "Basic"
"advanced" → "Advanced"
"safety" → "Safety"
"custom" → "Specialty"
"certification" → "Certification"
```

### Lesson Object
```typescript
interface Lesson {
  _id: string;                    // MongoDB ObjectId
  title: string;                  // e.g., "Tools & Safety"
  content?: string;               // Markdown (only if enrolled)
  durationMinutes: number;        // Lesson duration
  order: number;                  // 1-indexed lesson sequence
  videoUrl?: string;              // YouTube embed or direct video URL
  imageUrl?: string;              // Guide/reference image
}
```

### Course Object
```typescript
interface Course {
  _id: string;                    // MongoDB ObjectId
  title: string;                  // e.g., "Professional Plumbing Fundamentals"
  slug: string;                   // URL-safe slug (unique)
  description: string;            // Course overview
  category: CourseCategory;       // One of the 5 categories
  price: number;                  // In PHP (₱); 0 = free
  durationMinutes: number;        // Total course duration
  badgeSlug: string;              // Badge identifier for earned badges
  enrollmentCount: number;        // How many providers enrolled
  lessons: Lesson[];              // Nested lesson array
  enrolled?: boolean;             // Whether current provider enrolled
  enrollmentStatus?: "enrolled" | "completed" | null;  // Provider's status
  completedLessonsCount?: number; // Number of completed lessons
}
```

### Enrollment Object
```typescript
interface Enrollment {
  _id: string;                    // MongoDB ObjectId
  providerId: string;             // Provider user ID
  courseId: string | Course;      // Can be populated with full course
  courseTitle: string;            // Cached title (for display without populating)
  amountPaid: number;             // Amount paid in PHP (0 for free/wallet)
  status: "enrolled" | "completed" | "refunded";
  completedLessons: string[];     // Array of completed lesson IDs
  completedAt: Date | null;       // Completion timestamp (null if not completed)
  badgeGranted: boolean;          // Whether badge was awarded
  walletTxId?: string | null;     // Wallet transaction ID (if paid via wallet)
  paymongoSessionId?: string | null;  // PayMongo session ID (if paid via card)
  ledgerJournalId?: string | null;    // Accounting ledger entry ID
  createdAt: Date;                // Enrollment created time
  updatedAt: Date;                // Last updated time
}
```

### Earned Badge Object (stored on ProviderProfile)
```typescript
interface EarnedBadge {
  badgeSlug: string;              // e.g., "plumbing-fundamentals"
  courseTitle: string;            // Cached title at time of earning
  earnedAt: Date;                 // When badge was earned
}
```

---

## Authentication & Authorization

### Token Requirements
All endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Role-Based Access
- Only users with `role: "provider"` can enroll and access training endpoints
- Clients cannot access `/api/provider/training` endpoints
- Each user can only view/modify their own enrollments

### Error Responses

**401 Unauthorized** (Missing/Invalid Token)
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden** (Insufficient Permissions)
```json
{
  "error": "Only providers can access training"
}
```

**Mobile Implementation:**
- Store JWT in secure storage (e.g., Keychain on iOS, SecureSharedPreferences on Android)
- Include in all API requests via Authorization header
- Handle 401 errors by prompting re-authentication
- Refresh token if expired before making requests

---

## User Flows

### Flow 1: Browse & Enroll (Free Course via Wallet)
```
1. User navigates to Training tab
2. App fetches GET /api/provider/training (categories: all)
3. Display courses in grid/carousel with category filters
4. User selects "Professional Plumbing Fundamentals" (Free, ₱0)
5. App fetches GET /api/provider/training/courseId1
6. Display course overview, lessons list (locked, no content)
7. User taps "Enroll Free" button
8. App POSTs /api/provider/training/courseId1/enroll
9. Response: enrollment created, status=enrolled
10. UI updates: Show "Start Course" button, unlock lesson content
11. Fetch course again: GET /api/provider/training/courseId1 (now with lesson content)
12. Show first lesson, progress bar
13. User can begin learning
```

### Flow 2: Browse & Enroll (Paid Course via Wallet)
```
1. User scrolls to "Advanced Electrical Systems" (₱1500)
2. App fetches GET /api/provider/training/courseId2
3. Display course overview, lessons list (locked)
4. User taps "Wallet Pay" button
5. Show confirmation dialog: "Enroll for ₱1500 from your wallet?"
6. If low balance, suggest PayMongo as fallback
7. User confirms
8. App POSTs /api/provider/training/courseId2/enroll
9a. If SUCCESS: Enrollment created, show success toast, proceed to lessons
9b. If INSUFFICIENT BALANCE: Show "Not enough wallet balance" error
    → Suggest "Pay with Card" option
```

### Flow 3: Browse & Enroll (Paid Course via PayMongo)
```
1. User selects "Advanced Electrical Systems" (₱1500)
2. User taps "Card Pay" button
3. App POSTs /api/provider/training/courseId2/checkout
4. Receives: checkoutUrl + checkoutSessionId
5. App saves checkoutSessionId to sessionStorage: `training_session_courseId2`
6. App opens checkoutUrl in in-app WebView or browser
7. User completes PayMongo checkout
8. After payment, PayMongo redirects to our app with ?payment=success
9. App detects redirect, retrieves checkoutSessionId from storage
10. App POSTs /api/provider/training/courseId2/activate { sessionId }
11a. If SUCCESS: Enrollment activated, show success toast
11b. If PENDING: Show "Processing enrollment…" message, poll for activation
12. Once activated, unlock lessons, show course content
```

### Flow 4: Complete Course & Earn Badge
```
1. User in course player, completes lessons one-by-one
2. For each lesson, after video/content viewed:
   → User taps "Mark Complete" button
   → App POSTs /api/provider/training/enrollments/enrollId/lessons/lessonId/complete
   → Progress bar updates (e.g., 2/5 → 3/5)
   → Auto-advance to next lesson
3. After final lesson marked complete:
   → "Claim Badge & Complete" button appears
4. User taps "Claim Badge & Complete"
5. App POSTs /api/provider/training/enrollments/enrollId/complete
6. Response: status=completed, badgeGranted=true, completedAt=now
7. Show celebration screen with badge popup
8. Offer: "Download Certificate" button
9. User taps → App fetches GET /api/provider/training/courseId/certificate
10. Display certificate, offer download/share options
```

### Flow 5: View My Certificates
```
1. User navigates to "My Certificates" tab or section
2. Fetch GET /api/provider/training/enrollments
3. Filter enrollments where status=completed
4. Display as cards: badge icon + title + completion date
5. User taps certificate card
6. Fetch GET /api/provider/training/courseId/certificate
7. Display certificate with download/share buttons
```

---

## Payment Integration

### PayMongo Checkout Flow

**Step 1: Create Checkout Session**
```
POST /api/provider/training/[id]/checkout

Response:
{
  "checkoutUrl": "https://checkout.paymongo.com/pay/cms_xxxxxxxxx",
  "checkoutSessionId": "cs_test_2bwxxxxxxxxxxxxc15"
}

⚠️ CRITICAL: Save checkoutSessionId immediately
```

**Step 2: Open Checkout URL**
```javascript
// Mobile implementation
const checkoutUrl = response.checkoutUrl;
const sessionId = response.checkoutSessionId;

// Save session ID for activation after redirect
sessionStorage.setItem(`training_session_${courseId}`, sessionId);

// Open checkout in WebView or browser
window.location.href = checkoutUrl;
```

**Step 3: Handle Payment Result**
- **Success:** PayMongo redirects to `https://app.localpro.com/provider/training/[id]?payment=success`
- **Cancelled:** PayMongo redirects to `https://app.localpro.com/provider/training/[id]?payment=cancelled`

**Step 4: Activate Enrollment**
```javascript
// After redirect back to app
const params = new URLSearchParams(window.location.search);
const paymentStatus = params.get("payment");

if (paymentStatus === "success") {
  // Retrieve saved session ID
  const sessionId = sessionStorage.getItem(`training_session_${courseId}`);
  sessionStorage.removeItem(`training_session_${courseId}`);
  
  if (sessionId) {
    // Activate enrollment
    const response = await fetch(
      `/api/provider/training/${courseId}/activate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      }
    );
    
    if (response.ok) {
      toast.success("Payment received! Enrollment activated.");
      // Navigate to course or refresh
    }
  }
} else if (paymentStatus === "cancelled") {
  toast.error("Payment was cancelled. Try again from the course catalog.");
}
```

**Fallback: Activation Polling**

If activation endpoint fails (e.g., webhook not yet processed), implement polling:

```javascript
async function activateWithPolling(courseId, sessionId, maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const activateRes = await fetch(
        `/api/provider/training/${courseId}/activate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        }
      );

      if (activateRes.ok) {
        const data = await activateRes.json();
        if (data.activated) {
          toast.success("Enrollment activated!");
          return true;
        }
      }
    } catch (error) {
      // Ignore polling errors
    }

    if (attempt < maxAttempts) {
      // Wait 3 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  toast("Enrollment is being processed. Please refresh in a moment.");
  return false;
}
```

### Wallet Payment Flow

**Step 1: Enroll via Wallet**
```
POST /api/provider/training/[id]/enroll

Response (Success):
{
  "activated": true,
  "enrollment": { ... }
}

Response (Insufficient Balance):
{
  "error": "Insufficient wallet balance. Current balance: ₱500, Course cost: ₱1500"
}
```

**Step 2: Handle Response**
```javascript
const response = await fetch(
  `/api/provider/training/${courseId}/enroll`,
  { method: "POST" }
);

if (response.status === 201) {
  toast.success("Enrolled successfully!");
  // Navigate to course
} else if (response.status === 402) {
  // Insufficient balance
  const data = await response.json();
  toast.error(data.error);
  // Suggest PayMongo alternative
  showPaymentOptions(courseId, price);
}
```

---

## Badge & Certificate System

### Badge Earning
- Earned when provider completes all lessons and clicks "Claim Badge & Complete"
- Stored on `ProviderProfile.earnedBadges` array
- Each badge includes:
  - `badgeSlug`: Identifier (e.g., "plumbing-fundamentals")
  - `courseTitle`: Title at time of earning
  - `earnedAt`: Timestamp

### Certificate Generation
- Generated on-demand when user requests (not pre-generated)
- Unique certificate number: `LP-{last 8 chars of enrollmentId}`
- Includes:
  - Provider name
  - Course title
  - Course category
  - Badge slug (for logo display)
  - Completion date
  - Certificate number

### Mobile UI for Badges
**Show badges in profile:**
- Small badge icons (e.g., 32x32px)
- Display in grid layout under "Earned Certificates" section
- On tap: Show certificate details modal
- Action: Download as PDF/image

---

## Mobile UI/UX Guidelines

### Training Hub Layout

**Recommended Tab Structure:**
```
Training Hub
├── Courses (default)
│   ├── Category filter buttons (horizontal scroll)
│   │   • All
│   │   • Basic
│   │   • Advanced
│   │   • Safety
│   │   • Specialty
│   │   • Certification
│   └── Course grid
│       ├── My Certificates (if any completed—prominent section at top)
│       ├── My Courses (if any enrolled—featured section)
│       └── Available Courses (scrollable grid)
└── Certificates
    └── List downloaded certificates with details
```

### Course Card Design

**For Available Courses:**
```
┌─────────────────────────────────┐
│ [Badge] BASIC                   │
│ Professional Plumbing           │
│ Learn essentials...             │ (2 line max)
│                                 │
│ 📖 8 lessons  ⏱️ 120 min       │
│                                 │
│ ₱0 FREE                         │
│ [Enroll Free] or [Pay Card]    │
└─────────────────────────────────┘
```

**For Enrolled Courses:**
```
┌─────────────────────────────────┐
│ Professional Plumbing           │
│ Status: 3/8 lessons completed   │
│                                 │
│ [████████░░░░░░░░░░░░] 37%     │
│                                 │
│ [▶️ Continue →]                │
└─────────────────────────────────┘
```

**For Completed Courses:**
```
┌─────────────────────────────────┐
│ 🏆 Professional Plumbing        │
│ ✓ Completed                     │
│                                 │
│ [📜 View Certificate]           │
└─────────────────────────────────┘
```

### Course Player Layout (Inside Course)

**Header:**
```
← Back to Courses      [Share]    [✓ Complete]
Course Title
Progress: 3/8 lessons | 37%
[████████░░░░░░░░░░░░░░]
```

**Main Content (Sidebar + Viewer on Desktop / Stacked on Mobile):**
```
Left Sidebar (Lessons):
├── Lesson 1 [✓]
├── Lesson 2 [✓]
├── Lesson 3 [●] ← current
├── Lesson 4 [ ]
└── ...
[Button: Claim Badge] (only if all done)

Center/Main:
Video/Image + Content Viewer:
├── Video player (if videoUrl present)
├── Guide image (if imageUrl present)
└── Markdown content (sanitized, rendered as HTML)

[Previous] [Mark Complete] [Next]
```

### Certificate View

**Mobile Sheet/Modal:**
```
┌──────────────────────────────────┐
│ X                      [📥 Save] │
├──────────────────────────────────┤
│     🏅 LocalPro Certificate      │
│                                  │
│  Professional Plumbing           │
│  Fundamentals                    │
│                                  │
│  Awarded to:                     │
│  Juan dela Cruz                  │
│                                  │
│  Issued: April 8, 2026           │
│  No. LP-ABCD1234                 │
│                                  │
│ [📥 Download PDF] [📤 Share]    │
└──────────────────────────────────┘
```

### Loading & Error States

**Loading:**
- Show skeleton loader for course grid
- Spinner for enrollment/payment operations
- "Processing… Please wait" for PayMongo activation

**Empty States:**
- "No courses available yet" if courses list empty
- "You haven't earned any certificates yet" for certificates tab

**Error Handling:**
- Toast notifications for validation errors
- Retry button for network errors
- Clear error messages (not generic "Error occurred")

---

## Error Handling

### HTTP Status Codes & Responses

| Status | Scenario | Response |
|--------|----------|----------|
| 200 | Success (GET/POST operations) | Standard response |
| 201 | Created (enrollment) | Standard response |
| 401 | Missing/invalid auth token | `{ "error": "Authentication required" }` |
| 402 | Insufficient wallet balance | `{ "error": "Insufficient wallet balance…" }` |
| 403 | Insufficient permissions | `{ "error": "Only providers can…" }` |
| 404 | Resource not found | `{ "error": "Course not found" }` |
| 409 | Conflict (already enrolled) | `{ "error": "Already enrolled in this course" }` |
| 422 | Validation/business logic error | `{ "error": "Must complete all lessons…" }` |
| 500 | Server error | `{ "error": "Internal server error" }` |

### Mobile Error Handling Patterns

**Network Errors:**
```javascript
try {
  const res = await fetch(...);
  const data = await res.json();
  
  if (!res.ok) {
    // Handle errors by status code
    if (res.status === 401) {
      // Prompt re-authentication
      redirectToLogin();
    } else if (res.status === 402) {
      // Insufficient balance - suggest alternative
      showPaymentOptions();
    } else {
      // Generic error toast
      toast.error(data.error || "Something went wrong");
    }
    return;
  }
  // Handle success
} catch (error) {
  // Network timeout or connection error
  toast.error("Network error. Please check your connection.");
}
```

**User-Friendly Messages:**
- ✗ "Invalid object ID" → "Course not found"
- ✗ "Document not found" → "You are not enrolled in this course"
- ✓ "Enrollment confirmed! ₱500 was deducted from your wallet"
- ✓ "Payment not received or session expired"

---

## Implementation Checklist

### Phase 1: Core Training Hub

- [ ] Create Training tab/screen
- [ ] Implement course listing (`GET /api/provider/training`)
- [ ] Build course grid with category filters
- [ ] Style course cards (available, enrolled, completed)
- [ ] Implement course detail view (`GET /api/provider/training/[id]`)
- [ ] Add lesson list with lock icons for non-enrolled users

### Phase 2: Enrollment (Free & Wallet)

- [ ] Build enrollment flow for free courses (`POST .../enroll`)
- [ ] Implement wallet payment flow with confirmation dialog
- [ ] Handle insufficient balance errors
- [ ] Show success toast and navigate to course
- [ ] Fetch course again to unlock lesson content
- [ ] Add "Enroll" and "Pay with Wallet" buttons

### Phase 3: PayMongo Integration

- [ ] Implement checkout initiation (`POST .../checkout`)
- [ ] Save `checkoutSessionId` before checkout redirect
- [ ] Open PayMongo checkout in WebView/browser
- [ ] Handle redirect back with `?payment=success/cancelled`
- [ ] Implement activation endpoint (`POST .../activate`)
- [ ] Add fallback polling for webhook race condition
- [ ] Show "Processing enrollment…" banner during activation
- [ ] Add "Pay with Card" button

### Phase 4: Course Player

- [ ] Build lesson viewer with markdown content
- [ ] Embed video players (YouTube/direct URLs)
- [ ] Display guide images
- [ ] Implement lessons sidebar/list
- [ ] Show progress bar
- [ ] Add "Mark Complete" button for each lesson
- [ ] Call completion endpoint (`POST .../lessons/.../complete`)
- [ ] Auto-advance to next incomplete lesson
- [ ] Show "Claim Badge & Complete" only when all done

### Phase 5: Badge & Certificate

- [ ] Implement course completion endpoint (`POST .../complete`)
- [ ] Show celebration modal on completion
- [ ] Display earned badge info
- [ ] Implement certificate view (`GET .../certificate`)
- [ ] Render certificate (certificate number, provider name, date, etc.)
- [ ] Add download/share options
- [ ] Build "My Certificates" section in profile

### Phase 6: Polish & Edge Cases

- [ ] Error handling for all endpoints
- [ ] Loading states and skeletons
- [ ] Empty states
- [ ] Offline caching (optional, for course content)
- [ ] Session timeout handling
- [ ] Race condition handling (webhook + activation click)
- [ ] Unit tests for payment flows
- [ ] E2E tests for enrollment → completion → badge
- [ ] Analytics tracking (course views, enrollments, completions)

### Phase 7: Testing

- [ ] Free course enrollment flow
- [ ] Paid course wallet enrollment flow
- [ ] Paid course PayMongo flow (both success & cancel)
- [ ] Lesson completion and progress
- [ ] Badge earning and certificate download
- [ ] Error cases: insufficient balance, invalid course, not enrolled
- [ ] Network error handling and offline behavior
- [ ] Token expiration and re-authentication

---

## Integration Notes for Mobile Team

### Storage Requirements
- **JWT Token:** Secure storage (Keychain/Biometric on mobile)
- **Session IDs:** Temporary sessionStorage for PayMongo session IDs
- **Enrollments:** Sync/cache with local database for offline capability

### API Base URL
```
Production: https://localpro-marketplace.vercel.app/api/provider/training
Staging: https://staging-marketplace.vercel.app/api/provider/training (if available)
```

### Markdown Rendering
- Use a markdown library to render `lesson.content` (markdown text)
- **Security:** Sanitize HTML using DOMPurify or similar
- Support formatting: bold, italic, lists, code blocks, links

### Video Embedding
- Support YouTube embed URLs (iframe)
- Support direct video URLs (.mp4, .webm)
- For direct URLs, use native video player

### Image Handling
- Load `lesson.imageUrl` with lazy loading
- Cache images for offline viewing
- Handle missing/404 images gracefully

### Performance Considerations
- Lazy-load lesson content (don't fetch entire course initially)
- Paginate large course lists if >50 courses
- Cache enrollment status to minimize API calls
- Use optimistic UI updates for lesson completion

### Analytics Events to Track
```
- training.course.viewed
- training.course.enrolled (payload: courseId, method: "wallet" | "card")
- training.payment.success
- training.payment.cancelled
- training.lesson.completed
- training.course.completed
- training.badge.earned
- training.certificate.downloaded
```

---

## FAQ

**Q: Can I enroll in the same course twice?**  
A: No, the system prevents duplicate enrollments with a unique index on (providerId, courseId).

**Q: What happens if payment succeeds but activation fails?**  
A: The backend webhook will eventually activate the enrollment. If immediate activation fails, the app can poll the course endpoint to detect webhook activation. A 24-second polling window is typical.

**Q: Can I refund/unenroll after paying?**  
A: Current system doesn't support unenrollment/refunds via API. Contact support for manual refunds.

**Q: How long does a badge appear on my profile?**  
A: Badges are permanent once earned. They're stored in `ProviderProfile.earnedBadges`.

**Q: Can I download certificates offline?**  
A: Yes, once fetched, clients can cache the certificate data. The certificate is generated server-side but downloaded as PDF client-side.

**Q: What countries/currencies are supported?**  
A: Currently, all prices are in PHP (Philippine Peso). All examples use ₱ currency symbol.

---

**Document Version:** 1.0  
**Last Updated:** April 8, 2026  
**Maintained By:** LocalPro Development Team
