# LocalPro Marketplace — Accounting System Design

> **Version:** 1.0
> **Date:** 2026-03-09
> **Status:** Design / Pre-implementation
> **Author:** Engineering team

---

## Table of Contents

1. [Current State — As-Is Financial Map](#1-current-state--as-is-financial-map)
2. [Current Problems](#2-current-problems)
3. [Proposed Accounting Model](#3-proposed-accounting-model)
4. [Chart of Accounts](#4-chart-of-accounts)
5. [Journal Entry Map](#5-journal-entry-map)
6. [New Data Models](#6-new-data-models)
7. [Migration Plan](#7-migration-plan)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Current State — As-Is Financial Map

### 1.1 Money Flow Overview

```
CLIENT                 PLATFORM               PROVIDER
  │                       │                      │
  │  Pays ₱1,000          │                      │
  │──────────────────────►│                      │
  │  (PayMongo checkout)  │  Escrow Funded       │
  │                       │  Transaction=pending │
  │                       │                      │
  │  Job Completed        │                      │
  │──────────────────────►│                      │
  │                       │  Escrow Released     │
  │                       │  Transaction=completed│
  │                       │                      │
  │                       │  ₱850 owed          │──────────►
  │                       │  ₱150 commission     │  Provider
  │                       │  kept by platform    │  requests
  │                       │                      │  payout
  │                       │◄──────────────────────│
  │                       │  Admin approves      │
  │                       │  bank transfer       │──────────►
  │                       │  (external)          │  Bank
```

### 1.2 Current Financial Models

| Model | Purpose | Who uses it |
|---|---|---|
| `Payment` | PayMongo checkout session record | Client → Platform |
| `Transaction` | Escrow ledger with commission split | Platform internal |
| `Wallet` | Client credit balance | Client |
| `WalletTransaction` | Wallet operation log | Client |
| `WalletWithdrawal` | Client bank withdrawal request | Client |
| `Payout` | Provider earnings bank withdrawal request | Provider |

### 1.3 All Financial Flows — Current Implementation

---

#### Flow 1: Escrow Funding via PayMongo (Live)

```
Trigger: Client pays via PayMongo checkout

Step 1 — POST /api/payments
  → Payment { status: "awaiting_payment", paymentIntentId, amount }

Step 2 — User completes PayMongo checkout page

Step 3 — POST /api/webhooks/paymongo (event: checkout_session.payment.paid)
  → Payment { status: "paid", paymentId }
  → Job    { escrowStatus: "funded" }
  → Transaction {
      status: "pending",
      amount:    ₱1,000,   ← full job budget
      commission: ₱150,    ← 15% (or 20% for premium categories)
      netAmount:  ₱850,    ← owed to provider when released
      payerId:   clientId,
      payeeId:   providerId
    }

Step 4 (optional) — Save card token to User if paid by card
  → User { savedPaymentMethodId, savedPaymentMethodLast4, savedPaymentMethodBrand }
```

**Commission rates:**
- Standard categories: **15%**
- Premium categories (HVAC, Roofing, Construction, etc.): **20%**

---

#### Flow 2: Escrow Funding via Wallet

```
Trigger: Client clicks "Fund from Wallet"
Route: POST /api/jobs/:id/fund-wallet

Step 1 — Validate available balance
  Wallet.balance - SUM(pending WalletWithdrawals) >= jobBudget

Step 2 — Debit wallet atomically
  → Wallet      { balance: balance - amount }        ← $inc, atomic
  → WalletTransaction {
      type:        "escrow_payment",
      amount:      ₱1,000,
      balanceAfter: Wallet.balance
    }

Step 3 — Fund escrow
  → Job { escrowStatus: "funded" }
  → Transaction {
      status:    "pending",
      amount:    ₱1,000,
      commission: ₱150,
      netAmount:  ₱850
    }
```

---

#### Flow 3: Escrow Funding via Auto-Pay (Recurring Jobs)

```
Trigger: Cron job — saved card charge (off-session)
Service: paymentService.autoChargeEscrow()

→ PayMongo off-session charge
→ If success:
    Job         { escrowStatus: "funded" }
    Transaction { status: "pending", amount, commission, netAmount }
→ If failure:
    Send manual-fund reminder notification
```

---

#### Flow 4: Escrow Release (Full)

```
Trigger: Client confirms job complete
Route: PATCH /api/jobs/:id/complete → escrowService.releaseEscrow()

→ Job         { escrowStatus: "released", status: "completed" }
→ Transaction { status: "completed" }  ← provider earnings confirmed
→ ProviderProfile { completedJobCount++, completionRate: recalculated }
→ LoyaltyTransaction (points awarded to client)
→ Notification to provider: "₱850 ready for payout"
```

---

#### Flow 5: Escrow Release (Milestone-by-Milestone)

```
Trigger: Client releases each milestone
Route: POST /api/jobs/:id/milestones/:mId/release

Per milestone (e.g., ₱1,000 of ₱3,000 job):
  → Job.milestones[i] { status: "released", releasedAt: now }
  → Transaction {
      status: "completed",    ← immediate, not pending
      amount:    ₱1,000,
      commission: ₱150,
      netAmount:  ₱850
    }

When ALL milestones released:
  → Job             { escrowStatus: "released" }
  → Original pending Transaction { status: "refunded" }  ← nulled out
  → ProviderProfile metrics updated
```

---

#### Flow 6: Partial Release (Admin)

```
Trigger: Admin orders partial release
Route: POST /api/jobs/:id/partial-release

→ Job {
    escrowStatus: "released" (partial),
    partialReleaseAmount: ₱600    ← portion released
  }
→ Transaction (₱600) { status: "completed" }
→ Transaction (₱400) { status: "refunded" }  ← remainder refunded
→ WalletTransaction (client): type="refund_credit", amount=₱400
```

---

#### Flow 7: Dispute — Platform Refunds Client

```
Trigger: Admin resolves dispute in client's favour
Route: PATCH /api/admin/disputes/:id (action: refund)

→ Job         { status: "refunded", escrowStatus: "refunded" }
→ Transaction { status: "refunded" }
→ WalletTransaction {
    type:   "refund_credit",
    amount:  ₱1,000,   ← FULL amount back (no commission kept)
    userId:  clientId
  }
→ Wallet { balance: balance + 1000 }
→ Payment { status: "refunded", refundId }  ← PayMongo refund issued
```

---

#### Flow 8: Dispute — Platform Releases to Provider

```
Trigger: Admin resolves dispute in provider's favour

→ Job         { status: "completed", escrowStatus: "released" }
→ Transaction { status: "completed" }
→ Provider can now request payout as normal
```

---

#### Flow 9: Provider Payout Request

```
Trigger: Provider navigates to earnings → requests payout
Route: POST /api/payouts

Calculation:
  available = SUM(Transaction.netAmount WHERE payeeId=me AND status="completed")
             - SUM(Payout.amount WHERE providerId=me AND status IN [pending, processing, completed])

→ Payout {
    status:        "pending",
    amount:        ₱850,
    bankName:      "BDO",
    accountNumber: "...",
    accountName:   "..."
  }

Note: No money moved in DB — just a request record
```

---

#### Flow 10: Admin Approves Payout

```
Trigger: Admin reviews payout queue
Route: PATCH /api/admin/payouts/:id

→ Payout { status: "processing" or "completed" or "rejected" }

Note: Actual bank transfer is MANUAL / external to the system.
      Completion is manually marked by admin.
```

---

#### Flow 11: Client Wallet Withdrawal

```
Trigger: Client requests bank withdrawal of wallet balance
Route: POST /api/wallet/withdraw

Step 1 — Deduct immediately
  → Wallet { balance: balance - amount }  ← atomic $inc
  → WalletTransaction {
      type:        "withdrawal",
      amount:      ₱500,
      balanceAfter: Wallet.balance
    }

Step 2
  → WalletWithdrawal { status: "pending" }
```

---

#### Flow 12: Admin Rejects Wallet Withdrawal

```
Trigger: Admin rejects withdrawal request
Route: PATCH /api/admin/wallet/withdrawals/:id (action: reject)

→ WalletWithdrawal { status: "rejected" }
→ Wallet { balance: balance + amount }  ← restore
→ WalletTransaction {
    type:   "withdrawal_reversed",
    amount:  ₱500
  }
```

---

### 1.4 Commission Logic

```typescript
// src/lib/commission.ts
const HIGH_RATE_CATEGORIES = [
  "HVAC", "Roofing", "Major Home Renovation", "Construction Contracts",
  "Commercial Maintenance", "Masonry & Tiling", "Welding & Fabrication",
  "Mechanical & Industrial", "Safety & Security"
];

function calculateCommission(gross: number, category?: string): {
  gross: number;
  commission: number;
  netAmount: number;  // Note: field is `netAmount` not `net`
  rate: number;
} {
  const rate = HIGH_RATE_CATEGORIES.includes(category ?? "") ? 0.20 : 0.15;
  const commission = Math.round(gross * rate * 100) / 100;
  return { gross, commission, netAmount: gross - commission, rate };
}
```

---

## 2. Current Problems

### 2.1 Single-Entry Bookkeeping

Every money movement is recorded as a **single write** to one model. There is no matching debit/credit pair. This makes it impossible to:
- Verify the books balance (`assets = liabilities + equity`)
- Detect data corruption or lost transactions
- Produce a trial balance
- Satisfy any formal accounting audit

**Example of the gap:**
When a client pays ₱1,000:
- `Payment.status = "paid"` ✅ recorded
- `Transaction.status = "pending"` ✅ recorded
- But there is no entry saying: **"Platform now holds ₱1,000 in escrow"** as a balance sheet liability

### 2.2 No Platform Revenue Account

The ₱150 commission is calculated and stored in `Transaction.commission`, but:
- It is never posted to a **platform revenue ledger**
- There is no way to query "total platform revenue this month"
- If a dispute leads to a full refund, the commission reversal is not explicitly tracked
- Admin revenue dashboard must re-aggregate `Transaction.commission` each time from scratch

### 2.3 Race Conditions on Wallet

```
User A: GET wallet balance → ₱1,000 available
User B: GET wallet balance → ₱1,000 available
User A: Initiate withdrawal ₱800
User B: Initiate withdrawal ₱800
Both: $inc balance -800 succeeds → Wallet.balance = -600 ← OVERDRAFT
```

The `$inc` is atomic per operation but there is no pre-check + deduct atomicity. The balance check happens before the deduction in application code, not inside a DB transaction.

### 2.4 No Escrow Liability Tracking

The platform receives ₱1,000 from a client. Until the job is complete, that money belongs to neither the platform nor the provider — it is a **liability** (client's money held in trust). This is never recorded as such. If someone queries "how much money is the platform holding in escrow right now?" there is no direct answer — it must be inferred from `Transaction WHERE status="pending"`.

### 2.5 Provider Payout Reconciliation Gap

```
Provider completes 10 jobs × ₱850 net = ₱8,500 earned
Provider requests payout ₱8,500 → Payout.status = "processing"
Provider requests ANOTHER payout ₱8,500 → sumPaidOut() counts the first at "processing"
→ Second request allowed: ₱8,500 × 2 = ₱17,000 in payout requests vs ₱8,500 earned

Why: sumPaidOut() includes pending + processing + completed → correctly blocks
     BUT between request creation and DB write, two concurrent requests could both pass the check
```

### 2.6 Floating-Point Currency Storage

All amounts stored as JavaScript `Number` (IEEE 754 double). Example:
```
₱1,000.10 × 15% = 150.015 → stored as 150.01500000000001
₱1,000.10 - 150.01500000000001 = 850.085 → stored as 850.0849999999999
```

Over thousands of transactions, these errors accumulate. **All amounts must be integers (centavos).**

### 2.7 Currency Field Missing

No financial model has a `currency` field. When multi-currency support is added (USD, IDR, KES, etc.), there will be no way to know which currency a transaction is in without joining through Job → AppSetting. This breaks any accounting query.

### 2.8 Partial Release Accounting Mismatch

When an admin does a partial release (₱600 of ₱1,000 job):
- A `Transaction` for ₱600 is marked "completed"
- A `Transaction` for ₱400 is marked "refunded"
- But `Job.partialReleaseAmount` is stored as a separate field
- The two transactions and the job field can get out of sync if the partial release fails halfway

### 2.9 No Financial Close / Period Reporting

There is no concept of:
- Accounting periods (daily close, monthly close)
- Balance sheet snapshots
- Income statement for a given period
- Accounts receivable / accounts payable aging

---

## 3. Proposed Accounting Model

### 3.1 Double-Entry Bookkeeping

Every financial event creates **two journal entries**: one debit and one credit. The accounting equation always holds:

```
Assets = Liabilities + Equity
```

For LocalPro, the accounts are:

```
ASSETS
  1000  Cash / Gateway Receivable    ← Money received but not yet settled
  1100  Escrow Held                  ← Client money held pending job completion
  1200  Wallet Funds                 ← Client wallet balances

LIABILITIES
  2000  Escrow Payable to Clients    ← Owed back to client (if job fails)
  2100  Earnings Payable to Providers← Provider earned, not yet paid out
  2200  Wallet Payable to Clients    ← Client wallet balances owed

REVENUE
  4000  Commission Revenue           ← Platform fee on job completion
  4100  Subscription Revenue         ← Business plan fees (future)

EXPENSES
  5000  Refunds Issued               ← Dispute refunds, cancellations
  5100  Payment Processing Fees      ← PayMongo fees (future)
```

### 3.2 Ledger Entry Per Event

Each financial event posts one or more `LedgerEntry` records — an immutable, append-only journal.

```
LedgerEntry {
  id:           UUID
  journalId:    string       ← Groups related entries (e.g., "escrow-fund-job-abc123")
  entryType:    string       ← "escrow_funded", "commission_earned", "escrow_released", etc.
  debitAccount: AccountCode  ← Account being debited
  creditAccount: AccountCode ← Account being credited
  amount:       number       ← Integer (centavos)
  currency:     string       ← "PHP", "USD", etc.
  entityType:   string       ← "job", "payout", "wallet_withdrawal", etc.
  entityId:     ObjectId     ← Reference to the entity
  userId:       ObjectId     ← Who triggered this
  description:  string       ← Human-readable note
  createdAt:    Date
  reversedBy:   UUID?        ← If this entry was reversed, pointer to reversal entry
  reversalOf:   UUID?        ← If this IS a reversal, pointer to original
}
```

### 3.3 How Each Flow Maps to Journal Entries

#### Event: Client pays ₱1,000 escrow (PayMongo)

```
Journal ID: escrow-fund-job-[jobId]

Entry 1:
  debit:   1000 Cash/Gateway Receivable   ₱1,000
  credit:  2000 Escrow Payable to Client  ₱1,000
  note:    "Client paid escrow for Job #[jobId]"

Entry 2 (commission recognition — accrual basis):
  debit:   2000 Escrow Payable to Client  ₱150
  credit:  4000 Commission Revenue        ₱150
  note:    "15% commission accrued on Job #[jobId]"

Entry 3 (net payable to provider):
  debit:   2000 Escrow Payable to Client  ₱850
  credit:  2100 Earnings Payable          ₱850
  note:    "₱850 earmarked for Provider #[providerId]"

Verification: 2000 Escrow Payable to Client balance = 0 ✓
              1000 Cash increased by ₱1,000 ✓
              4000 Commission Revenue increased by ₱150 ✓
              2100 Earnings Payable increased by ₱850 ✓
```

#### Event: Job completed — escrow released

```
Journal ID: escrow-release-job-[jobId]

Entry 1:
  debit:   2100 Earnings Payable         ₱850
  credit:  1100 Escrow Held              ₱850
  note:    "Provider earnings confirmed, awaiting payout"

No additional entries needed — commission was already recognized at funding.
```

#### Event: Provider payout sent (admin marks completed)

```
Journal ID: payout-complete-[payoutId]

Entry 1:
  debit:   2100 Earnings Payable         ₱850
  credit:  1000 Cash/Gateway Receivable  ₱850
  note:    "Payout #[payoutId] sent to Provider bank"

Verification: 2100 Earnings Payable decreases by ₱850 ✓
              1000 Cash decreases by ₱850 ✓
```

#### Event: Dispute — full refund to client

```
Journal ID: dispute-refund-job-[jobId]

Entry 1 (reverse commission):
  debit:   4000 Commission Revenue        ₱150
  credit:  5000 Refunds Issued            ₱150
  note:    "Commission reversed — dispute refund Job #[jobId]"

Entry 2 (reverse earnings payable):
  debit:   2100 Earnings Payable          ₱850
  credit:  2200 Wallet Payable to Client  ₱850
  note:    "Provider earning reversed — credited to client wallet"

Entry 3 (move remainder to client wallet):
  debit:   2000 Escrow Payable to Client  ₱0   ← already 0 after funding entries
  credit:  2200 Wallet Payable to Client  ₱150
  note:    "Commission portion refunded to client wallet"

Net effect: Client wallet +₱1,000, Provider earns ₱0, Platform commission ₱0
```

#### Event: Client funds escrow from wallet

```
Journal ID: wallet-escrow-fund-job-[jobId]

Entry 1:
  debit:   2200 Wallet Payable to Client  ₱1,000  ← Client's wallet liability decreases
  credit:  1100 Escrow Held              ₱1,000   ← Money moves to escrow
  note:    "Wallet-funded escrow for Job #[jobId]"

Entry 2 (commission accrual — same as PayMongo flow):
  debit:   1100 Escrow Held              ₱150
  credit:  4000 Commission Revenue       ₱150

Entry 3:
  debit:   1100 Escrow Held              ₱850
  credit:  2100 Earnings Payable         ₱850
```

---

## 4. Chart of Accounts

```
Account Code  Name                            Type        Normal Balance
────────────────────────────────────────────────────────────────────────
1000          Gateway Receivable              Asset       Debit
1100          Escrow Held                     Asset       Debit
1200          Wallet Funds Held               Asset       Debit
              ─────────────────────────────────────────────────────────
2000          Escrow Payable — Clients        Liability   Credit
2100          Earnings Payable — Providers    Liability   Credit
2200          Wallet Payable — Clients        Liability   Credit
2300          Withdrawal Payable — Clients    Liability   Credit
              ─────────────────────────────────────────────────────────
3000          Platform Equity                 Equity      Credit
              ─────────────────────────────────────────────────────────
4000          Commission Revenue              Revenue     Credit
4100          Subscription Revenue            Revenue     Credit
4200          Late Fee Revenue (future)       Revenue     Credit
              ─────────────────────────────────────────────────────────
5000          Refunds Issued                  Expense     Debit
5100          Payment Processing Fees (future)Expense     Debit
5200          Bad Debt / Write-offs (future)  Expense     Debit
```

---

## 5. Journal Entry Map

### 5.1 Complete Journal Entry Reference

| Event | Debit | Credit | Amount | Notes |
|---|---|---|---|---|
| Client pays via PayMongo | 1000 Gateway Rcv | 2000 Escrow Payable | full | |
| Commission accrual at funding | 2000 Escrow Payable | 4000 Commission Rev | commission | 15% or 20% |
| Net earmarked to provider | 2000 Escrow Payable | 2100 Earnings Payable | netAmount | |
| Client funds from wallet | 2200 Wallet Payable | 1100 Escrow Held | full | |
| Wallet→Escrow commission accrual | 1100 Escrow Held | 4000 Commission Rev | commission | |
| Wallet→Escrow net to provider | 1100 Escrow Held | 2100 Earnings Payable | netAmount | |
| Escrow released (full) | (no new entries) | | | Commission already posted |
| Provider payout sent | 2100 Earnings Payable | 1000 Gateway Rcv | payout amt | |
| Client wallet withdrawal sent | 2300 Withdrawal Payable | 1200 Wallet Funds | amount | |
| Wallet withdrawal rejected | 1200 Wallet Funds | 2300 Withdrawal Payable | amount | Reversal |
| Dispute — refund client | 4000 Commission Rev | 5000 Refunds Issued | commission | Reversal |
| Dispute — refund client | 2100 Earnings Payable | 2200 Wallet Payable | netAmount | Credit client |
| Dispute — release to provider | (no new entries) | | | Earnings already posted |
| Client wallet top-up (future) | 1000 Gateway Rcv | 2200 Wallet Payable | amount | |
| Admin credit adjustment | 1000 Gateway Rcv | 2200 Wallet Payable | amount | Manual |
| Admin debit adjustment | 2200 Wallet Payable | 1000 Gateway Rcv | amount | Manual |

### 5.2 Balance Sheet at Any Point in Time

```
ASSETS
  1000 Gateway Receivable   = SUM(payments received) - SUM(payouts sent)
  1100 Escrow Held          = SUM(wallet-funded escrows) - SUM(escrows released/refunded)
  1200 Wallet Funds Held    = SUM(wallet credits) - SUM(wallet withdrawals)

LIABILITIES
  2000 Escrow Payable       = Should always = 0 after funding entries split it
  2100 Earnings Payable     = Provider earnings waiting for payout
  2200 Wallet Payable       = All client wallet balances combined
  2300 Withdrawal Payable   = Pending withdrawals in flight

REVENUE
  4000 Commission Revenue   = Total platform commissions earned
  4100 Subscription Rev     = Business plan fees

EXPENSES
  5000 Refunds Issued       = Total dispute refunds

EQUITY
  3000 Platform Equity      = Revenue - Expenses
```

**Golden rule — must always hold:**
```
Total Assets = Total Liabilities + Total Revenue - Total Expenses
```

---

## 6. New Data Models

### 6.1 `LedgerEntry` — Core Accounting Table

```typescript
// src/models/LedgerEntry.ts

const LedgerEntrySchema = new Schema({
  // Journal grouping
  journalId: {
    type: String,
    required: true,
    index: true,
    // e.g., "escrow-fund-{jobId}", "payout-{payoutId}", "dispute-{disputeId}"
  },

  // Entry type (human-readable event name)
  entryType: {
    type: String,
    required: true,
    enum: [
      "escrow_funded_gateway",       // Client pays via PayMongo
      "escrow_funded_wallet",        // Client funds from wallet
      "commission_accrued",          // Platform commission at escrow funding
      "earnings_earmarked",          // Provider net earmarked at escrow funding
      "escrow_released",             // Job completed — earnings confirmed
      "payout_sent",                 // Provider bank transfer sent
      "wallet_funded_gateway",       // Client tops up wallet (future)
      "wallet_debited_escrow",       // Wallet used for escrow
      "wallet_withdrawal_requested", // Client withdrawal initiated
      "wallet_withdrawal_completed", // Admin marks withdrawal done
      "wallet_withdrawal_reversed",  // Admin rejects withdrawal
      "dispute_refund_commission",   // Commission reversed on refund
      "dispute_refund_earnings",     // Earnings reversed on refund
      "dispute_release",             // Dispute resolved for provider
      "admin_credit",                // Manual admin credit
      "admin_debit",                 // Manual admin debit
      "partial_release",             // Partial escrow release
      "milestone_release",           // Milestone-based release
      "reversal",                    // Generic reversal
    ],
  },

  // Double-entry accounts
  debitAccount: {
    type: String,
    required: true,
    enum: ["1000", "1100", "1200", "2000", "2100", "2200", "2300",
           "3000", "4000", "4100", "4200", "5000", "5100", "5200"],
  },
  creditAccount: {
    type: String,
    required: true,
    enum: ["1000", "1100", "1200", "2000", "2100", "2200", "2300",
           "3000", "4000", "4100", "4200", "5000", "5100", "5200"],
  },

  // Amount — ALWAYS stored as integer (centavos)
  amountCentavos: { type: Number, required: true, min: 0 },
  currency:       { type: String, required: true, default: "PHP" },

  // References — what entity triggered this
  entityType: {
    type: String,
    required: true,
    enum: ["job", "payout", "payment", "wallet_withdrawal",
           "dispute", "transaction", "recurring_schedule", "manual"],
  },
  entityId: { type: Schema.Types.ObjectId, required: true },

  // Parties involved
  clientId:   { type: Schema.Types.ObjectId, ref: "User", default: null },
  providerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  initiatedBy:{ type: Schema.Types.ObjectId, ref: "User", required: true },

  description: { type: String, required: true },

  // Reversal chain
  reversedBy: { type: String, default: null },  // journalId of reversal
  reversalOf: { type: String, default: null },  // journalId being reversed

  // Metadata
  metadata: { type: Schema.Types.Mixed, default: {} },

}, {
  timestamps: { createdAt: true, updatedAt: false },  // Immutable
  collection: "ledger_entries",
});

// Indexes
LedgerEntrySchema.index({ journalId: 1 });
LedgerEntrySchema.index({ entityType: 1, entityId: 1 });
LedgerEntrySchema.index({ debitAccount: 1, createdAt: -1 });
LedgerEntrySchema.index({ creditAccount: 1, createdAt: -1 });
LedgerEntrySchema.index({ clientId: 1, createdAt: -1 });
LedgerEntrySchema.index({ providerId: 1, createdAt: -1 });
LedgerEntrySchema.index({ currency: 1, createdAt: -1 });
```

### 6.2 `AccountBalance` — Running Balance Cache

Recomputing account balances from `LedgerEntry` on every query would be slow. This model caches the current balance per account per currency. Recomputed nightly by cron.

```typescript
// src/models/AccountBalance.ts

const AccountBalanceSchema = new Schema({
  accountCode: { type: String, required: true },   // "1000", "4000", etc.
  currency:    { type: String, required: true, default: "PHP" },
  balance:     { type: Number, required: true, default: 0 },  // Integer centavos
  asOf:        { type: Date,   required: true },   // When last recomputed
}, {
  timestamps: true,
});

AccountBalanceSchema.index({ accountCode: 1, currency: 1 }, { unique: true });
```

### 6.3 Changes to Existing Models

#### `Transaction` — Add currency and integer amounts

```typescript
// Add to Transaction schema:
currency:      { type: String, default: "PHP" },
commissionRate:{ type: Number, required: true },  // e.g., 0.15 — store rate used
chargeType: {
  type: String,
  enum: ["job_escrow", "milestone_release", "partial_release", "recurring"],
  required: true,
},
ledgerJournalId: { type: String, default: null },  // Links to LedgerEntry.journalId
```

#### `Payment` — Add confirmedAt, currency, idempotency

```typescript
// Add to Payment schema:
currency:      { type: String, default: "PHP" },
confirmedAt:   { type: Date,   default: null },
refundedAt:    { type: Date,   default: null },
webhookEventId:{ type: String, default: null, index: true, sparse: true },  // Idempotency
```

#### `Wallet` — Add reservedAmount and version

```typescript
// Add to Wallet schema:
reservedAmount: { type: Number, default: 0 },  // Locked for in-flight withdrawals
currency:       { type: String, default: "PHP" },
version:        { type: Number, default: 0 },  // Optimistic lock
```

#### `Payout` — Add currency and ledger link

```typescript
// Add to Payout schema:
currency:        { type: String, default: "PHP" },
ledgerJournalId: { type: String, default: null },
```

---

## 7. Migration Plan

### 7.1 Phase 0 — Preparation (no downtime, no breaking changes)

1. Deploy `LedgerEntry` and `AccountBalance` models (new collections, no existing data touched)
2. Deploy new `ledgerService` alongside existing services (not yet called)
3. Update `Transaction`, `Payment`, `Wallet`, `Payout` schemas to add NEW optional fields
   - `commissionRate`, `chargeType`, `ledgerJournalId`, `currency`, `confirmedAt`, `webhookEventId`, `reservedAmount`, `version`
   - All fields default to null/0 — no existing records break

### 7.2 Phase 1 — Backfill (run as one-time migration script)

```typescript
// scripts/backfill-ledger.mjs
// For each existing completed Transaction:
//   Reconstruct the journal entries from stored fields
//   Create LedgerEntry records dated to Transaction.createdAt
//   Mark Transaction.ledgerJournalId = generated journalId

// For each existing WalletTransaction:
//   Reconstruct matching LedgerEntry
//   Mark linked

// After backfill:
//   Compute AccountBalance by aggregating all LedgerEntry records
```

### 7.3 Phase 2 — Wire New Services (behind feature flag)

1. Add `ledgerService.postJournal(journalId, entries[])` — writes all entries atomically
2. Wrap each financial flow: call `ledgerService.postJournal()` AFTER the existing DB writes succeed
   - Existing code continues to work (Transaction, WalletTransaction still written as before)
   - LedgerEntry added as parallel write (belt-and-suspenders)
3. Enable feature flag in staging, verify balances reconcile

### 7.4 Phase 3 — Validate & Switch Over

1. Run daily reconciliation: `SUM(Transaction.netAmount WHERE status=completed)` must equal `SUM(LedgerEntry debit to 2100)`
2. Add admin dashboard: Trial Balance, Income Statement, Balance Sheet views
3. Once reconciliation passes for 30 days, remove duplicate data paths

### 7.5 Phase 4 — Harden

1. Standardize all amounts to centavos (integer): migration script converts existing float amounts
2. Add `currency` field to all financial models
3. Add MongoDB session transactions on Wallet balance updates
4. Add `reservedAmount` to Wallet + use it in all withdrawal flows

---

## 8. Implementation Roadmap

### Sprint A — Foundation (Week 1–2)

| Task | File | Description |
|---|---|---|
| Create `LedgerEntry` model | `src/models/LedgerEntry.ts` | Full schema with indexes |
| Create `AccountBalance` model | `src/models/AccountBalance.ts` | Balance cache |
| Create `ledger.repository.ts` | `src/repositories/ledger.repository.ts` | `postJournal(entries[])`, `getAccountBalance(code)`, `getTrialBalance()` |
| Create `ledger.service.ts` | `src/services/ledger.service.ts` | `postEscrowFunded()`, `postEscrowReleased()`, `postPayoutSent()`, `postDisputeRefund()`, `postWalletDebit()`, `postWalletCredit()` |
| Add missing fields to `Transaction` | `src/models/Transaction.ts` | `currency`, `commissionRate`, `chargeType`, `ledgerJournalId` |
| Add missing fields to `Payment` | `src/models/Payment.ts` | `currency`, `confirmedAt`, `refundedAt`, `webhookEventId` |
| Add missing fields to `Wallet` | `src/models/Wallet.ts` | `reservedAmount`, `currency`, `version` |
| Add missing fields to `Payout` | `src/models/Payout.ts` | `currency`, `ledgerJournalId` |

---

### Sprint B — Wire Flows (Week 3–4)

| Task | File | Description |
|---|---|---|
| Wire escrow funding (PayMongo) | `src/services/payment.service.ts` | Call `ledgerService.postEscrowFunded()` after `atomicMarkPaid()` |
| Wire escrow funding (wallet) | `src/app/api/jobs/[id]/fund-wallet/route.ts` | Call ledger service after wallet debit |
| Wire escrow release | `src/services/escrow.service.ts` | Call `ledgerService.postEscrowReleased()` |
| Wire payout completion | `src/app/api/admin/payouts/[id]/route.ts` | Call `ledgerService.postPayoutSent()` |
| Wire dispute refund | `src/services/dispute.service.ts` | Call `ledgerService.postDisputeRefund()` |
| Wire wallet withdrawal | `src/services/wallet.service.ts` | Call `ledgerService.postWalletWithdrawal()` |
| Wire wallet withdrawal reversal | `src/app/api/admin/wallet/withdrawals/[id]` | Call `ledgerService.postWithdrawalReversed()` |
| Add webhook idempotency | `src/app/api/webhooks/paymongo/route.ts` | Check `webhookEventId` before processing |

---

### Sprint C — Atomicity & Race Conditions (Week 5)

| Task | File | Description |
|---|---|---|
| Wallet atomic session | `src/repositories/wallet.repository.ts` | Wrap `$inc` + `WalletTransaction.create()` in MongoDB session |
| Add `reservedAmount` logic | `src/repositories/wallet.repository.ts` | `reserveBalance()`, `releaseReservation()`, `commitReservation()` |
| Update withdrawal flow | `src/services/wallet.service.ts` | Reserve → process → commit/release pattern |
| Payment dedup index | `src/models/Payment.ts` | `{ jobId, clientId, status: "awaiting_payment" }` unique |

---

### Sprint D — Reporting & Admin UI (Week 6–7)

| Task | File | Description |
|---|---|---|
| Trial balance API | `src/app/api/admin/accounting/trial-balance/route.ts` | All account balances |
| Income statement API | `src/app/api/admin/accounting/income-statement/route.ts` | Revenue - Expenses for period |
| Balance sheet API | `src/app/api/admin/accounting/balance-sheet/route.ts` | Assets = Liabilities + Equity |
| Escrow in-flight API | `src/app/api/admin/accounting/escrow-holdings/route.ts` | All funded-not-released jobs |
| Provider payable API | `src/app/api/admin/accounting/provider-payable/route.ts` | Earnings owed to all providers |
| Reconciliation cron | `src/app/api/cron/reconcile-ledger/route.ts` | Daily: verify balances match |
| Admin accounting page | `src/app/(dashboard)/admin/accounting/page.tsx` | Trial balance + charts |
| Backfill migration | `scripts/backfill-ledger.mjs` | Reconstruct history from existing data |

---

### Sprint E — Standardize Amounts (Week 8)

| Task | Description |
|---|---|
| Convert all amounts to centavos | Migration script: `amount × 100` for all financial models |
| Add `currency` field everywhere | Default "PHP", required for all new records |
| Update `commission.ts` | Return centavos integers, not floats |
| Update display layer | All currency display: `amount / 100` formatted with `Intl.NumberFormat` |

---

## Appendix A — ledgerService API

```typescript
// src/services/ledger.service.ts

interface JournalOptions {
  journalId: string;
  entityType: string;
  entityId: ObjectId;
  clientId?: ObjectId;
  providerId?: ObjectId;
  initiatedBy: ObjectId;
  currency?: string;  // defaults to "PHP"
}

// Called when client pays escrow via PayMongo or wallet
async function postEscrowFunded(
  opts: JournalOptions,
  grossCentavos: number,
  commissionCentavos: number,
  netCentavos: number
): Promise<void>

// Called when job is completed and escrow is released
async function postEscrowReleased(
  opts: JournalOptions,
  netCentavos: number
): Promise<void>

// Called when admin marks payout as completed
async function postPayoutSent(
  opts: JournalOptions,
  amountCentavos: number
): Promise<void>

// Called when admin resolves dispute in client's favour
async function postDisputeRefund(
  opts: JournalOptions,
  grossCentavos: number,
  commissionCentavos: number,
  netCentavos: number
): Promise<void>

// Called when client wallet is debited (escrow funding)
async function postWalletDebitEscrow(
  opts: JournalOptions,
  amountCentavos: number
): Promise<void>

// Called when client wallet is credited (refund)
async function postWalletCredit(
  opts: JournalOptions,
  amountCentavos: number,
  reason: string
): Promise<void>

// Called when client requests wallet withdrawal
async function postWalletWithdrawal(
  opts: JournalOptions,
  amountCentavos: number
): Promise<void>

// Called when admin rejects wallet withdrawal
async function postWithdrawalReversed(
  opts: JournalOptions,
  amountCentavos: number
): Promise<void>

// Generic manual adjustment (admin)
async function postAdminAdjustment(
  opts: JournalOptions,
  type: "credit" | "debit",
  account: AccountCode,
  amountCentavos: number,
  reason: string
): Promise<void>

// Get current balance for an account
async function getAccountBalance(
  accountCode: AccountCode,
  currency?: string
): Promise<number>

// Get full trial balance
async function getTrialBalance(
  currency?: string
): Promise<{ account: AccountCode; name: string; balance: number }[]>
```

---

## Appendix B — Reconciliation Checks

Run daily via `GET /api/cron/reconcile-ledger`.

```
CHECK 1: Total debits = total credits
  SUM(LedgerEntry.amountCentavos WHERE debitAccount = X)
= SUM(LedgerEntry.amountCentavos WHERE creditAccount = X)

CHECK 2: Earnings payable matches provider owed
  Account 2100 balance
= SUM(Transaction.netAmount WHERE status = "completed")
- SUM(Payout.amount WHERE status = "completed")

CHECK 3: Escrow in-flight matches pending transactions
  Account 1100 balance
= SUM(Transaction.amount WHERE status = "pending")

CHECK 4: Wallet payable matches wallet balances
  Account 2200 balance
= SUM(Wallet.balance FOR all users)

CHECK 5: Commission revenue reconciles
  Account 4000 balance
= SUM(Transaction.commission WHERE status IN ["completed", "pending"])
- SUM(Transaction.commission WHERE status = "refunded" AND resolvedAsRefund = true)
```

Each failed check creates a `ReconciliationAlert` record and notifies the admin team.

---

*This document must be reviewed and approved before any implementation begins.*
*Next step: Review with team → approve → begin Sprint A.*
