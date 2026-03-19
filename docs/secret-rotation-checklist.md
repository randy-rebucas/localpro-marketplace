# Secret Rotation Checklist

> **Purpose**: Track every secret used by LocalPro Marketplace, where to rotate it,
> and what breaks when you do.
> **Last reviewed**: 2026-03-20
> **Rule**: Never store actual secret values in this file.

---

## Priority Legend

| Priority | Meaning |
|----------|---------|
| P0 | Rotate **immediately** if compromised -- payment or authentication secrets |
| P1 | Rotate **within 24 hours** -- grants access to user data or infrastructure |
| P2 | Rotate **within 72 hours** -- third-party API keys with limited blast radius |
| P3 | Rotate at next scheduled maintenance -- low-risk or development-only keys |

---

## 1. Payment Providers (P0)

### PayMongo

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `PAYMONGO_SECRET_KEY` | [PayMongo Dashboard > API Keys](https://dashboard.paymongo.com/developers) | All in-flight payment intents using the old key will fail. Redeploy immediately after rotation. |
| `PAYMONGO_WEBHOOK_SECRET` | PayMongo Dashboard > Webhooks -- delete old endpoint, create new one | Webhook signature verification fails until the new secret is deployed; missed payment events until resolved. |

### PayPal

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `PAYPAL_CLIENT_ID` | [PayPal Developer Dashboard > Applications](https://developer.paypal.com/dashboard/applications/) | All PayPal checkout flows break until the new ID is deployed. |
| `PAYPAL_CLIENT_SECRET` | Same dashboard as above | Same as client ID -- all server-side PayPal API calls fail. |
| `PAYPAL_WEBHOOK_ID` | PayPal Dashboard > Webhooks -- delete and recreate the webhook | Webhook verification fails; missed PayPal event notifications. |

---

## 2. Authentication & Session Secrets (P0)

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `JWT_SECRET` | Generate locally: `openssl rand -hex 64` | **All existing access tokens are invalidated. Every logged-in user is forced to re-authenticate.** |
| `JWT_REFRESH_SECRET` | Generate locally: `openssl rand -hex 64` | **All existing refresh tokens are invalidated. Every user is forced to re-login (no silent refresh possible).** |
| `FACEBOOK_APP_SECRET` | [Meta Developers > App Settings > Basic](https://developers.facebook.com/) | Facebook OAuth login breaks until the new secret is deployed. Users who rely on Facebook login cannot sign in. |

---

## 3. SMS / Phone Verification (P1)

### Twilio

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `TWILIO_AUTH_TOKEN` | [Twilio Console > Account > Auth Token](https://console.twilio.com/) (click "Rotate" button) | All Twilio API calls fail until the new token is deployed. SMS OTP verification is unavailable. |
| `TWILIO_ACCOUNT_SID` | Not rotatable -- tied to the account. Create a new sub-account if compromised. | N/A |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Console > Verify > Services -- create a new service | Pending OTP verifications on the old service are lost. |
| `TWILIO_PHONE_NUMBER` | Twilio Console > Phone Numbers -- release and acquire a new number | Users who saved the old number will not recognize the new sender. |

---

## 4. Database (P1)

### MongoDB Atlas

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `MONGODB_URI` (contains username & password) | [MongoDB Atlas > Database Access](https://cloud.mongodb.com/) -- edit user, set new password | **Total application downtime** until the new URI is deployed to all environments. |
| `MONGODB_ATLAS_PUBLIC_KEY` | Atlas > Access Manager > API Keys -- create new key, delete old | Backup cron jobs and admin snapshot features fail until redeployed. |
| `MONGODB_ATLAS_PRIVATE_KEY` | Same as above (keys are created as a pair) | Same as public key. |
| `MONGODB_ATLAS_PROJECT_ID` | Not rotatable -- inherent to the Atlas project. | N/A |

---

## 5. Email (P1)

### Resend

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `RESEND_API_KEY` | [Resend Dashboard > API Keys](https://resend.com/api-keys) -- create new key, revoke old | All transactional emails (verification, password reset, notifications) stop sending until redeployed. |
| `SMTP_PASS` | Same as `RESEND_API_KEY` (legacy alias, same value) | No direct app impact (unused), but rotate alongside `RESEND_API_KEY` to keep values in sync. |

---

## 6. AI / Machine Learning (P2)

### OpenAI

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `OPENAI_API_KEY` | [OpenAI Platform > API Keys](https://platform.openai.com/api-keys) -- create new key, revoke old | AI-powered features (search, recommendations) return errors until redeployed. Non-critical to core marketplace flow. |

---

## 7. Media / Storage (P2)

### Cloudinary

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `CLOUDINARY_API_KEY` | [Cloudinary Console > Settings > Security](https://console.cloudinary.com/settings) | Image uploads fail. Existing images remain accessible (served via public URLs). |
| `CLOUDINARY_API_SECRET` | Same dashboard -- regenerate the API secret | Same as API key -- all server-side Cloudinary operations fail. |
| `CLOUDINARY_CLOUD_NAME` | Not rotatable -- inherent to the account. | N/A |

---

## 8. Google Services (P2)

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials) | Maps and geocoding stop working on the frontend. Service listings lose map displays. |
| `NEXT_PUBLIC_GTM_ID` | [Google Tag Manager](https://tagmanager.google.com/) -- create new container if compromised | Analytics tracking stops. No user-facing impact. |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | [Google Search Console](https://search.google.com/search-console/) | Only affects SEO verification. No user-facing impact. |

---

## 9. Push Notifications -- VAPID (P2)

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `VAPID_PRIVATE_KEY` | Generate new pair: `npx web-push generate-vapid-keys` | **All existing push subscriptions are invalidated.** Every user must re-subscribe to push notifications. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same command as above (keys are a pair) | Must be rotated together with the private key. |

---

## 10. Infrastructure & Cron (P2)

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `CRON_SECRET` | Generate locally: `openssl rand -base64 64` | Scheduled cron jobs (e.g., backup, cleanup) fail authentication until redeployed. No user-facing impact if resolved within the cron interval. |
| `VERCEL_OIDC_TOKEN` | Auto-issued by Vercel at deploy time. Re-deploy to rotate. | Short-lived; typically self-rotates. |

### Upstash Redis (not yet configured)

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `UPSTASH_REDIS_REST_URL` | [Upstash Console](https://console.upstash.com/) -- create new database or reset credentials | Rate limiting and JWT revocation list unavailable until redeployed. |
| `UPSTASH_REDIS_REST_TOKEN` | Same console | Same as above. |

---

## 11. Error Tracking (P3 -- not yet configured)

### Sentry

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | [Sentry > Project Settings > Client Keys](https://sentry.io/) | Error reporting stops. No user-facing impact. |
| `SENTRY_AUTH_TOKEN` | [Sentry > Account > Auth Tokens](https://sentry.io/settings/account/api/auth-tokens/) | Source map uploads in CI fail. No user-facing impact. |

---

## 12. Development-Only Secrets (P3)

| Variable | Rotation location | Impact |
|----------|-------------------|--------|
| `DB_RESET_TOKEN` | Set any new random value manually | Only affects local dev seed/reset endpoint. No production impact. |
| `SEED_ADMIN_PASSWORD` | Set any new value manually | Only affects seeded admin account in dev. No production impact. |

---

## Rotation Procedure (General)

1. **Generate** the new secret value (do NOT reuse old values).
2. **Update** the secret in all deployment targets (Vercel environment variables, local `.env.local`).
3. **Deploy** the application to pick up the new value.
4. **Verify** the affected feature works (e.g., test a payment, send a test email).
5. **Revoke** the old secret in the provider dashboard only AFTER confirming the new one works.
6. **Log** the rotation in the team's incident channel with the date and reason.

---

## .gitignore Verification

`.env.local` is properly excluded from version control by **two** rules in `.gitignore`:

- Line 11: `.env.local` (exact match)
- Line 34: `.env*.local` (glob pattern covering all local env variants)

No changes to `.gitignore` are required.
