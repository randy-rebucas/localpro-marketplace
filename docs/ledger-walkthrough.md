# LocalPro Marketplace — Real-Case Ledger Walkthrough

> **Version:** 1.1
> **Date:** 2026-03-14
> **Status:** Reference / Training Document
> **Purpose:** Trace a complete real-world transaction through every financial stage,
> showing which accounts are debited and credited at each step and verifying the
> accounting equation holds throughout.

---

## Scenario Setup

| Party | Role | Action |
|---|---|---|
| **Ana** | Client | Books a plumbing job, pays ₱1,000 via PayMongo, tops up wallet ₱500, withdraws ₱300 |
| **Ben** | Provider | Completes the job, earns ₱850 net, requests and receives payout |
| **Platform** | — | Collects 15% commission = ₱150 on job completion |

**Commission rate:** 15% (standard category)
**Revenue recognition policy:** Commission is deferred — recognized only when escrow is released (job completed), not at payment time.

---

## Starting State — All Accounts at Zero

```
1000  Gateway Receivable       ₱0
2000  Escrow Payable            ₱0
2100  Earnings Payable          ₱0
2200  Wallet Payable            ₱0
2300  Withdrawal Payable        ₱0
2400  Payout In-Flight          ₱0
4000  Commission Revenue        ₱0
```

---

## Event 1 — Ana Pays ₱1,000 Escrow via PayMongo

**Flow:** Escrow Funding via Gateway (Flow 1)
**Trigger:** Ana completes PayMongo checkout for Job JOB001
**Route:** `POST /api/webhooks/paymongo` (checkout_session.payment.paid)

```
Journal ID: escrow-fund-JOB001

DR 1000  Gateway Receivable    +₱1,000   ← cash received from PayMongo
CR 2000  Escrow Payable        +₱1,000   ← held in trust; belongs to Ana until job completes
```

**Records written:**
- `Payment { status: "paid" }`
- `Transaction { status: "pending", amount: 1000, commission: 150, netAmount: 850 }`
- `LedgerEntry { journalId: "escrow-fund-JOB001", entryType: "escrow_funded_gateway" }`
- `Job { escrowStatus: "funded" }`

**Account balances after Event 1:**
```
1000  Gateway Receivable     ₱1,000  ✓
2000  Escrow Payable         ₱1,000  ✓   Ana's money held in trust
```

> ⚠️ Commission of ₱150 is NOT recorded here. Revenue is deferred until escrow release.

---

## Event 2 — Ana Tops Up Her Wallet with ₱500

**Flow:** Wallet Top-up via Gateway
**Trigger:** Ana adds funds to her wallet via PayMongo checkout
**Route:** `POST /api/wallet/topup/verify` (after PayMongo redirect)

```
Journal ID: wallet-topup-TOPUP001

DR 1000  Gateway Receivable    +₱500    ← cash received from PayMongo
CR 2200  Wallet Payable        +₱500    ← Ana's wallet balance increases
```

**Records written:**
- `WalletTransaction { type: "topup", amount: 500, balanceAfter: 500 }`
- `Wallet { balance: 500 }`
- `LedgerEntry { journalId: "wallet-topup-TOPUP001", entryType: "wallet_funded_gateway" }`

**Account balances after Event 2:**
```
1000  Gateway Receivable     ₱1,500  ✓
2200  Wallet Payable           ₱500  ✓   Ana's wallet
```

---

## Event 3 — Ana Confirms Job Complete — Escrow Released to Ben

**Flow:** Escrow Release / Revenue Recognition (Flow 3)
**Trigger:** Ana clicks "Release Payment" on the completed job (after reviewing before/after photos)
**Route:** `PATCH /api/jobs/JOB001/complete`

> Note: Ben (the provider) previously called `PATCH /api/jobs/JOB001/mark-complete` to set
> `job.status = "completed"`. Ana's action here releases the escrow — a separate step.

```
Journal ID: escrow-release-JOB001

DR 2000  Escrow Payable        −₱850   CR 2100  Earnings Payable     +₱850   ← Ben's net earnings recognized
DR 2000  Escrow Payable        −₱150   CR 4000  Commission Revenue   +₱150   ← Platform fee recognized
```

**Records written:**
- `Transaction { status: "completed" }`
- `Job { escrowStatus: "released", status: "completed" }`
- `LedgerEntry (1) { entryType: "escrow_released", debit: 2000, credit: 2100, amount: 850 }`
- `LedgerEntry (2) { entryType: "commission_accrued", debit: 2000, credit: 4000, amount: 150 }`
- `ProviderProfile { completedJobCount++, completionRate: recalculated }`
- `LoyaltyTransaction` (client points awarded)

**Account balances after Event 3:**
```
1000  Gateway Receivable     ₱1,500
2000  Escrow Payable             ₱0  ✓   fully cleared — Ana's trust liability settled
2100  Earnings Payable          ₱850  ✓   Ben is owed ₱850
2200  Wallet Payable            ₱500
4000  Commission Revenue        ₱150  ✓   platform revenue recognized for the first time
```

> ✅ This is the **revenue recognition event**. The ₱150 commission only enters the
> books NOW — not when Ana paid. This is the deferred revenue model.

---

## Event 4 — Ben Requests Payout of ₱850

**Flow:** Provider Payout Request (Flow 4)
**Trigger:** Ben navigates to Earnings → Request Payout
**Route:** `POST /api/payouts`

```
Journal ID: payout-requested-PAY001

DR 2100  Earnings Payable      −₱850   CR 2400  Payout In-Flight     +₱850   ← ring-fenced awaiting bank transfer
```

**Records written:**
- `Payout { status: "pending", amount: 850 }`
- `LedgerEntry { entryType: "payout_requested", debit: 2100, credit: 2400, amount: 850 }`

**Account balances after Event 4:**
```
1000  Gateway Receivable     ₱1,500
2100  Earnings Payable           ₱0  ✓   Ben's earnings moved to in-flight
2400  Payout In-Flight          ₱850  ✓   awaiting admin bank transfer approval
4000  Commission Revenue        ₱150
```

---

## Event 5 — Admin Marks Ben's Payout Completed (Bank Transfer Sent)

**Flow:** Admin Approves Payout (Flow 5)
**Trigger:** Admin confirms bank transfer done in admin panel
**Route:** `PATCH /api/admin/payouts/PAY001`

```
Journal ID: payout-sent-PAY001

DR 2400  Payout In-Flight      −₱850   CR 1000  Gateway Receivable   −₱850   ← cash leaves platform
```

**Records written:**
- `Payout { status: "completed", processedAt: now }`
- `LedgerEntry { entryType: "payout_sent", debit: 2400, credit: 1000, amount: 850 }`

**Account balances after Event 5:**
```
1000  Gateway Receivable       ₱650  ✓   ₱1,500 in − ₱850 paid out
2400  Payout In-Flight            ₱0  ✓   cleared
2200  Wallet Payable             ₱500
4000  Commission Revenue         ₱150
```

> 💸 Ben has been paid. ₱850 has physically left the platform's gateway account.

---

## Event 6 — Ana Requests Bank Withdrawal of ₱300 from Her Wallet

**Flow:** Client Wallet Withdrawal (Flow 8)
**Trigger:** Ana submits withdrawal form
**Route:** `POST /api/wallet/withdraw`

```
Journal ID: wallet-withdraw-WDR001

DR 2200  Wallet Payable        −₱300   CR 2300  Withdrawal Payable   +₱300   ← reservation created
```

**Records written:**
- `WalletWithdrawal { status: "pending", amount: 300 }`
- `Wallet { reservedAmount: +300 }` ← balance not deducted yet, just reserved
- `LedgerEntry { entryType: "wallet_withdrawal_requested", debit: 2200, credit: 2300, amount: 300 }`

**Account balances after Event 6:**
```
1000  Gateway Receivable       ₱650
2200  Wallet Payable            ₱200  ✓   ₱500 − ₱300 reserved = ₱200 spendable
2300  Withdrawal Payable        ₱300  ✓   in-flight, awaiting admin action
4000  Commission Revenue        ₱150
```

---

## Event 7A — Admin Approves Ana's Withdrawal (Happy Path)

**Flow:** Withdrawal Completed (Flow 9)
**Trigger:** Admin confirms bank transfer done
**Route:** `PATCH /api/admin/wallet/withdrawals/WDR001` → `status: "completed"`

```
Journal ID: wallet-withdraw-completed-WDR001

DR 2300  Withdrawal Payable    −₱300   CR 1000  Gateway Receivable   −₱300   ← cash leaves platform
```

**Records written:**
- `WalletWithdrawal { status: "completed", processedAt: now }`
- `Wallet { balance: −300, reservedAmount: −300 }` ← committed atomically
- `WalletTransaction { type: "withdrawal", amount: 300 }`
- `LedgerEntry { entryType: "wallet_withdrawal_completed", debit: 2300, credit: 1000, amount: 300 }`

**Account balances after Event 7A:**
```
1000  Gateway Receivable       ₱350  ✓   ₱650 − ₱300
2200  Wallet Payable            ₱200  ✓   Ana still has ₱200
2300  Withdrawal Payable          ₱0  ✓   cleared
4000  Commission Revenue        ₱150
```

---

## Event 7B — Admin Rejects Ana's Withdrawal (Alternate Path)

**Flow:** Withdrawal Rejected / Reversed (Flow 10)
**Trigger:** Admin rejects the withdrawal request
**Route:** `PATCH /api/admin/wallet/withdrawals/WDR001` → `status: "rejected"`

```
Journal ID: wallet-withdraw-reversed-WDR001

DR 2300  Withdrawal Payable    −₱300   CR 2200  Wallet Payable        +₱300   ← returned to Ana's wallet
```

**Records written:**
- `WalletWithdrawal { status: "rejected" }`
- `Wallet { reservedAmount: −300 }` ← reservation released, balance unchanged
- `WalletTransaction { type: "withdrawal_reversed", amount: 300 }`
- `LedgerEntry { entryType: "wallet_withdrawal_reversed", debit: 2300, credit: 2200, amount: 300 }`

**Account balances after Event 7B:**
```
1000  Gateway Receivable       ₱650  ✓   unchanged — no cash moved
2200  Wallet Payable            ₱500  ✓   Ana's full ₱300 restored
2300  Withdrawal Payable          ₱0  ✓   cleared
4000  Commission Revenue        ₱150
```

---

## Final State Comparison

| Account | After 7A (Approved) | After 7B (Rejected) | Meaning |
|---|---|---|---|
| 1000 Gateway Receivable | ₱350 | ₱650 | Platform cash on hand |
| 2000 Escrow Payable | ₱0 | ₱0 | No jobs in escrow |
| 2100 Earnings Payable | ₱0 | ₱0 | No unpaid provider earnings |
| 2200 Wallet Payable | ₱200 | ₱500 | Ana's remaining wallet balance |
| 2300 Withdrawal Payable | ₱0 | ₱0 | No pending withdrawals |
| 2400 Payout In-Flight | ₱0 | ₱0 | No payouts in transit |
| 4000 Commission Revenue | ₱150 | ₱150 | Platform earned ₱150 either way |

---

## Accounting Equation Verification (Happy Path — 7A)

$$\text{Assets} = \text{Liabilities} + \text{Revenue}$$

$$\underbrace{₱350}_{1000 \text{ Gateway}} = \underbrace{₱200}_{2200 \text{ Wallet Payable}} + \underbrace{₱150}_{4000 \text{ Commission}}$$

$$₱350 = ₱350 \quad ✓$$

---

## Full Money Trail Reconciliation (Happy Path — 7A)

```
Money IN to platform:
  Ana — escrow payment (PayMongo)     ₱1,000
  Ana — wallet top-up (PayMongo)        ₱500
  ─────────────────────────────────────────
  Total received:                     ₱1,500

Money OUT from platform:
  Ben — payout (bank transfer)          ₱850
  Ana — wallet withdrawal (bank)        ₱300
  ─────────────────────────────────────────
  Total paid out:                     ₱1,150

Remaining on platform:
  Ana's wallet balance                  ₱200
  Platform commission kept              ₱150
  ─────────────────────────────────────────
  Total remaining:                      ₱350

CHECK: ₱1,500 in − ₱1,150 out = ₱350 remaining ✓
```

---

## Complete Journal Entry Log (Happy Path)

| # | Journal ID | Entry Type | DR Account | CR Account | Amount |
|---|---|---|---|---|---|
| 1 | escrow-fund-JOB001 | escrow_funded_gateway | 1000 Gateway Rcv | 2000 Escrow Payable | ₱1,000 |
| 2 | wallet-topup-TOPUP001 | wallet_funded_gateway | 1000 Gateway Rcv | 2200 Wallet Payable | ₱500 |
| 3a | escrow-release-JOB001 | escrow_released | 2000 Escrow Payable | 2100 Earnings Payable | ₱850 |
| 3b | escrow-release-JOB001 | commission_accrued | 2000 Escrow Payable | 4000 Commission Rev | ₱150 |
| 4 | payout-requested-PAY001 | payout_requested | 2100 Earnings Payable | 2400 Payout In-Flight | ₱850 |
| 5 | payout-sent-PAY001 | payout_sent | 2400 Payout In-Flight | 1000 Gateway Rcv | ₱850 |
| 6 | wallet-withdraw-WDR001 | wallet_withdrawal_requested | 2200 Wallet Payable | 2300 Withdrawal Payable | ₱300 |
| 7 | wallet-withdraw-completed-WDR001 | wallet_withdrawal_completed | 2300 Withdrawal Payable | 1000 Gateway Rcv | ₱300 |

**Total debits:** ₱1,000 + ₱500 + ₱850 + ₱150 + ₱850 + ₱850 + ₱300 + ₱300 = **₱4,800**
**Total credits:** ₱1,000 + ₱500 + ₱850 + ₱150 + ₱850 + ₱850 + ₱300 + ₱300 = **₱4,800**

$$\text{Total Debits} = \text{Total Credits} \quad ₱4,800 = ₱4,800 \quad ✓$$

---

## Key Takeaways

1. **Revenue is deferred** — The ₱150 commission is only written to `4000 Commission Revenue` at escrow release (Event 3), never at payment (Event 1). A job refund before completion means zero commission impact.

2. **Two-step withdrawal** — Wallet withdrawals use a reserve-then-commit pattern. The balance is ring-fenced at request time (`2300 Withdrawal Payable`) and only hits cash (`1000`) when the admin confirms the bank transfer. Rejection returns it cleanly to `2200`.

3. **Payout in-flight** — Provider payouts ring-fence via `2400 Payout In-Flight` between request and bank transfer, keeping `2100 Earnings Payable` clean and queryable at any time.

4. **Every peso is traceable** — Every ₱1 that entered the platform (₱1,500) can be traced to exactly where it went: Ben's bank (₱850), Ana's bank (₱300), Ana's wallet (₱200), platform revenue (₱150).

5. **Double-entry constraint** — Because every event posts a matching DR/CR pair, total debits always equal total credits. Any discrepancy indicates a missing or corrupted journal entry.
