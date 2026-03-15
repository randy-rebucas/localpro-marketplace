# Incident Response Runbook

**Product:** LocalPro Marketplace  
**Last updated:** March 2026  
**Stack:** Next.js 15 · MongoDB Atlas (M10+) · Cloudinary · Vercel · Upstash Redis · Sentry

---

## 1. Severity Tiers

| Tier | Name | Definition | Response SLA | Resolution SLA |
|------|------|-----------|-------------|---------------|
| **P0** | Critical | Full site down, data loss, payment processing failure, security breach | 15 min | 4 hours |
| **P1** | Major | Core feature broken (job posting, payments, auth), impacting most users | 30 min | 8 hours |
| **P2** | Moderate | Degraded feature, affects subset of users, workaround exists | 2 hours | 48 hours |
| **P3** | Minor | UI glitch, non-critical feature broken, no data impact | 1 business day | 1 week |

---

## 2. Escalation Contacts

| Role | Contact | Channel |
|------|---------|---------|
| On-call Engineer | (assign per rotation) | Slack #incidents → PagerDuty |
| Database Lead | (assign) | Slack DM |
| Security | (assign) | Encrypted channel |
| Executive sponsor | (assign) | Phone |

**Admin Support Email:** `support@localpro.asia`  
**Sentry:** [sentry.io](https://sentry.io) (see `SENTRY_ORG` / `SENTRY_PROJECT` in env)

---

## 3. Health Checks

```
GET https://localpro.app/api/health
```

Returns per-service status: MongoDB, Cloudinary, Redis.

- HTTP `200` → all services operational  
- HTTP `207` → partial degradation (some services down)  
- HTTP `503` → critical failure (MongoDB unreachable)

Register `/api/health` in your uptime monitor (BetterUptime, UptimeRobot, etc.) for continuous polling.

---

## 4. MongoDB Atlas — Restore from Snapshot

**Primary recovery path** (M10+ with Continuous Cloud Backup):

1. Open [MongoDB Atlas Console](https://cloud.mongodb.com) → **Clusters** → your cluster
2. Click **Backups** in the left sidebar
3. Click **Restore** next to the desired snapshot (filter by date/time)
4. Choose restore target:
   - **Same cluster** — overwrites live data (P0 only)
   - **New cluster** — safe option for data validation before cutover
5. Review restore scope and confirm
6. Monitor restore progress in **Activity Feed**

**Atlas Admin API snapshot list:**
```
GET /api/admin/backup/snapshots (admin panel → Database → Snapshots tab)
```

**Snapshot retention:** 7 days (set at creation time; adjust in `backup.service.ts`)

**Post-restore checklist:**
- [ ] Verify document counts in Admin → Database match expected numbers
- [ ] Run smoke-test: create job, submit application, trigger payment
- [ ] Check Sentry for new errors after restore
- [ ] Notify affected users if data loss occurred (GDPR obligation within 72 hours)

---

## 5. MongoDB Atlas — Point-in-Time Recovery (PITR)

If M10+ Continuous Cloud Backup is enabled with PITR:

1. Atlas Console → Clusters → **Backups** → **Restore** → **Continuous Cloud Backup**
2. Select exact restore time (down to the minute)
3. Choose target cluster and confirm

PITR allows recovery to any second within the retention window (default: 7 days).

---

## 6. Vercel — Rollback a Deployment

```bash
# List recent deployments
vercel ls --prod

# Roll back to specific deployment
vercel rollback <DEPLOYMENT_URL_OR_ID>
```

Or via Vercel Dashboard:
**Settings → Deployments → (select deployment) → Promote to Production**

Rollback takes ~30 seconds. Edge config and environment variables are NOT rolled back — only the application code/image.

**After rollback, verify:**
- [ ] `/api/health` returns 200
- [ ] Auth login works
- [ ] Job creation works

---

## 7. Cloudinary — File/Media Recovery

Cloudinary assets are CDN-replicated globally — individual asset loss is unlikely.

**If assets are missing:**
1. Cloudinary Dashboard → **Media Library** — assets may be in the trash (30-day retention)
2. Check if assets are orphaned (uploaded but DB record deleted) — search by `public_id` prefix
3. For catastrophic Cloudinary account loss: assets are linked by `publicId` in DB; a re-upload workflow (provider KYC, avatars) is the only path

**Preventive measure:** Cloudinary DAM (Digital Asset Management) accounts include backup vaults — enable under account settings if on paid plan.

**Regenerate upload credentials** if API keys are compromised:
1. Cloudinary Dashboard → **Settings → Access Keys** → Regenerate
2. Update `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in Vercel environment variables
3. Trigger a new deployment: `vercel --prod`

---

## 8. Upstash Redis — Recovery

Redis is used for:
- Distributed rate limiting (`src/lib/rateLimit.ts`)
- JWT revocation (blocklist)

**Redis data loss impact:** Mild — rate limits reset (briefly allows higher traffic), revoked JWTs briefly unblocked (tokens expire within 15 min naturally).

**If Redis is unreachable:**
- Rate limiting falls back to in-memory limiter (see `rateLimit.ts`)
- App remains functional but without distributed rate limits

**Flush and restart:**
1. Upstash Console → select database → **Flush Database**
2. No app restart needed — keys are recreated on next request

**If token revocation list is lost:** Force all users to re-authenticate by rotating `JWT_SECRET` in Vercel env vars and redeploying. (Nuclear option — use only if tokens were stolen.)

---

## 9. Security Incident — Compromised Credentials

If any secret is believed to be compromised:

| Secret | Rotation Steps |
|--------|---------------|
| `JWT_SECRET` | Rotate in Vercel → redeploy → all users forced to re-login |
| `JWT_REFRESH_SECRET` | Same as above |
| `PAYMONGO_SECRET_KEY` | Rotate in PayMongo Dashboard → update Vercel env → redeploy |
| `CRON_SECRET` | Rotate in Vercel → update Vercel Cron header |
| `MONGODB_ATLAS_PUBLIC_KEY` | Rotate in Atlas → API Access Manager → update Vercel env |
| `CLOUDINARY_API_SECRET` | Rotate in Cloudinary Dashboard → update Vercel env |
| `UPSTASH_REDIS_REST_TOKEN` | Rotate in Upstash Console → update Vercel env → redeploy |

**After any secret rotation:** Trigger a new Vercel deployment to pick up env var changes.

---

## 10. Cron Job Failures

All cron jobs are registered in `vercel.json` and follow the `verifyCronSecret` auth pattern.

**Check cron execution:** Vercel Dashboard → **Functions** → **Cron Jobs**

| Cron | Schedule | Critical? |
|------|----------|-----------|
| `expire-jobs` | 2 AM daily | Yes |
| `release-escrow` | 3 AM daily | Yes — financial |
| `reconcile-ledger` | 6:30 AM daily | Yes — financial |
| `db-backup` | 1 AM daily | Yes — data safety |
| `dispute-overdue` | 1 AM daily | High |
| `maintenance` | Midnight daily | Medium |
| `retention-cleanup` | 2 AM monthly | Low |

**If a financial cron fails (release-escrow, reconcile-ledger):**
1. Check Sentry for error details
2. Manually trigger: `curl -H "Authorization: Bearer $CRON_SECRET" https://localpro.app/api/cron/release-escrow`
3. Verify ledger balance in Admin → Accounting
4. If data inconsistency found, engage database lead before retrying

---

## 11. Payment Provider Outages

**PayMongo:**
- Status page: [status.paymongo.com](https://status.paymongo.com)
- Webhooks queue while provider is down; they replay on recovery
- Escrow will not fund until webhook fires; communicate ETA to affected clients

**PayPal:**
- Status: [developer.paypal.com/status](https://developer.paypal.com/status)
- Same webhook replay behavior applies

---

## 12. Post-Incident Review Template

Complete within 48 hours of incident resolution:

```md
## Post-Incident Review — [DATE] [INCIDENT_TITLE]

**Severity:** P0 / P1 / P2 / P3  
**Duration:** [START] → [END] (total: XX min)  
**Affected users:** ~N users / all users  
**Root cause:** ...

### Timeline
- HH:MM — First alert / user report
- HH:MM — Engineer paged
- HH:MM — Root cause identified
- HH:MM — Fix deployed / mitigation applied
- HH:MM — Incident resolved

### Impact
- ...

### Root Cause Analysis
- ...

### Remediation steps taken
- ...

### Action items (prevent recurrence)
| Action | Owner | Due date |
|--------|-------|----------|
| ... | ... | ... |
```

---

## 13. Backup Verification Schedule

Run quarterly to ensure backups are usable:

- [ ] Trigger manual Atlas snapshot from Admin → Database → Snapshots
- [ ] Restore snapshot to a **test cluster** (never restore to production without incident)
- [ ] Verify document counts against production 
- [ ] Test `GET /api/health` on test instance returns 200
- [ ] Document results in this runbook with date and engineer sign-off

**Last verified:** _(update after each test)_  
**Verified by:** _(engineer name)_
