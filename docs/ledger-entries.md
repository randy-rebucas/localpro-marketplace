# Ledger Entries per Flow

**Version:** 1.1  
**Last Updated:** 2026-03-14

> **Revenue recognition policy (deferred model):** Commission and provider earnings are
> recognised only when escrow is **released** (job completed), not when the client pays.
> This means a dispute before completion results in zero net platform revenue — no reversal needed.

All amounts stored as **centavos** (integer). Examples use ₱1,000 budget at 15% commission → commission ₱150, provider net ₱850.

---

## Chart of Accounts (Quick Reference)

| Code | Account | Type |
|---|---|---|
| 1000 | Gateway Receivable | Asset |
| 1100 | Escrow Held | Asset |
| 1200 | Wallet Funds Held | Asset |
| 2000 | Escrow Payable — Clients | Liability |
| 2100 | Earnings Payable — Providers | Liability |
| 2200 | Wallet Payable — Clients | Liability |
| 2300 | Withdrawal Payable | Liability |
| 2400 | Payout In-Flight | Liability |
| 4000 | Commission Revenue | Revenue |
| 5000 | Refunds Issued | Expense |

> **2000 Escrow Payable** holds the client's money in trust from payment until job completion
> or refund. It is the staging account for deferred recognition.

---

## Flow 1 — Client Pays Escrow via PayMongo

**Trigger:** Webhook `checkout_session.payment.paid`  
**Route:** `PATCH /api/jobs/[id]/fund` → PayMongo checkout → webhook `POST /api/webhooks/paymongo`  
**Journal:** `escrow-fund-{jobId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `escrow_funded_gateway` | 1000 Gateway Receivable | 2000 Escrow Payable | ₱1,000 (gross) |

**Effect:** Platform holds ₱1,000. Client money is in trust — neither platform revenue nor provider earnings yet. Commission deferred until job completion.

---

## Flow 2 — Client Pays Escrow from Wallet

**Trigger:** Client clicks "Fund from Wallet"  
**Route:** `PATCH /api/jobs/[id]/fund-wallet`  
**Journal:** `escrow-fund-{jobId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `escrow_funded_wallet` | 2200 Wallet Payable | 2000 Escrow Payable | ₱1,000 (gross) |

**Effect:** Client wallet liability reduces by ₱1,000. Money moves from wallet trust to escrow trust — same client, different liability bucket. Commission still deferred.

---

## Flow 3 — Client Releases Escrow (Job Complete — Revenue Recognition)

**Trigger:** Client clicks "Release Payment" after reviewing before/after photos  
**Route:** `PATCH /api/jobs/[id]/complete`  
**Journal:** `escrow-release-{jobId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `escrow_released` | 2000 Escrow Payable | 2100 Earnings Payable | ₱850 (net) |
| 2 | `commission_accrued` | 2000 Escrow Payable | 4000 Commission Revenue | ₱150 (commission) |

**Effect — this is the revenue recognition event:**
- Escrow liability cleared (2000 → 0)
- Provider is owed ₱850 (2100 increases)
- Platform recognises ₱150 commission for the first time (4000 increases)

---

## Flow 4 — Provider Requests Payout (Ring-Fence)

**Trigger:** Provider submits payout request  
**Route:** `POST /api/payouts`  
**Journal:** `payout-requested-{payoutId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `payout_requested` | 2100 Earnings Payable | 2400 Payout In-Flight | ₱850 |

**Effect:** Earnings ring-fenced while admin processes bank transfer. 2100 Earnings Payable decreases; 2400 Payout In-Flight increases.

---

## Flow 5 — Admin Sends Provider Payout

**Trigger:** Admin marks payout as `completed` (bank transfer confirmed)  
**Route:** `PATCH /api/admin/payouts/[id]`  
**Journal:** `payout-sent-{payoutId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `payout_sent` | 2400 Payout In-Flight | 1000 Gateway Receivable | ₱850 |

**Effect:** In-flight liability cleared. Cash physically leaves the platform's account.

---

## Flow 6 — Dispute Resolved: Full Refund to Client

**Trigger:** Admin resolves dispute in client's favour  
**Route:** `PATCH /api/admin/disputes/[id]` (action: `refund`)  
**Journal:** `dispute-{disputeId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `dispute_refund` | 2000 Escrow Payable | 2200 Wallet Payable | ₱1,000 (gross) |

**Effect:** Escrow trust cleared in full. Client wallet credited ₱1,000. Platform recognises **zero** commission (it was never accrued). No reversal entries needed — this is the power of the deferred model.

---

## Flow 7 — Dispute Resolved: Provider Keeps Earnings

**Trigger:** Admin resolves dispute in provider's favour  
**Route:** `PATCH /api/admin/disputes/[id]` (action: `release`)  
**Journal:** `dispute-{disputeId}`

Identical to Flow 3 (Escrow Release):

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `escrow_released` | 2000 Escrow Payable | 2100 Earnings Payable | ₱850 (net) |
| 2 | `commission_accrued` | 2000 Escrow Payable | 4000 Commission Revenue | ₱150 (commission) |

**Effect:** Same as a normal job completion — commission recognised, provider owed ₱850.

---

## Flow 8 — Client Requests Wallet Withdrawal

**Trigger:** Client submits withdrawal request  
**Route:** `POST /api/wallet/withdraw`  
**Journal:** `withdrawal-{withdrawalId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `wallet_withdrawal_requested` | 2200 Wallet Payable | 2300 Withdrawal Payable | ₱500 |

**Effect:** Wallet liability converts to an in-flight withdrawal liability. Client's spendable balance reduced.

---

## Flow 9 — Admin Completes Wallet Withdrawal

**Trigger:** Admin marks withdrawal as `completed`  
**Route:** `PATCH /api/admin/wallet/withdrawals/[id]`  
**Journal:** `withdrawal-{withdrawalId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `wallet_withdrawal_completed` | 2300 Withdrawal Payable | 1000 Gateway Receivable | ₱500 |

**Effect:** In-flight liability cleared. Cash leaves the platform.

---

## Flow 10 — Admin Rejects Wallet Withdrawal

**Trigger:** Admin marks withdrawal as `rejected`  
**Route:** `PATCH /api/admin/wallet/withdrawals/[id]`  
**Journal:** `withdrawal-{withdrawalId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `wallet_withdrawal_reversed` | 2300 Withdrawal Payable | 2200 Wallet Payable | ₱500 |

**Effect:** In-flight liability reversed. Client wallet balance fully restored.

---

## Flow 11 — Client Tops Up Wallet (via PayMongo)

**Trigger:** Client completes wallet top-up checkout  
**Route:** `POST /api/payments` (`type: "wallet_topup"`) → webhook  
**Journal:** `wallet-topup-{userId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `wallet_funded_gateway` | 1000 Gateway Receivable | 2200 Wallet Payable | ₱500 |

**Effect:** Cash received. Client wallet balance increases.

---

## Flow 12 — Admin Manual Credit

**Trigger:** Admin issues goodwill or compensation credit  
**Route:** Admin panel → Manual Adjustment  
**Journal:** `admin-credit-{userId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `admin_credit` | 1000 Gateway Receivable | 2200 Wallet Payable | amount |

---

## Flow 13 — Admin Manual Debit

**Trigger:** Admin claws back or corrects a balance  
**Route:** Admin panel → Manual Adjustment  
**Journal:** `admin-debit-{userId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `admin_debit` | 2200 Wallet Payable | 1000 Gateway Receivable | amount |

---

## Flow 14 — Milestone Release (Partial Job Payment)

**Trigger:** Client releases an individual milestone  
**Route:** `PATCH /api/jobs/[id]/milestones/[mId]/release`  
**Journal:** `milestone-release-{jobId}-{mId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `milestone_release` | 2000 Escrow Payable | 2100 Earnings Payable | milestone net |
| 2 | `commission_accrued` | 2000 Escrow Payable | 4000 Commission Revenue | milestone commission |

**Effect:** Proportional amount released. When all milestones are released, `job.escrowStatus` → `"released"` and the original holding `Transaction` is nulled out.

---

## Flow 15 — Admin Partial Release

**Trigger:** Admin releases a partial amount from funded escrow  
**Route:** `POST /api/jobs/[id]/partial-release`  
**Journal:** `partial-release-{jobId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `partial_release` (net to provider) | 2000 Escrow Payable | 2100 Earnings Payable | released net |
| 2 | `commission_accrued` | 2000 Escrow Payable | 4000 Commission Revenue | released commission |
| 3 | `dispute_refund` (remainder to client) | 2000 Escrow Payable | 2200 Wallet Payable | refunded gross |

---

## Full Journey Summary (₱1,000 job, 15% commission — Deferred Model)

```
EVENT                              DR                    CR                    AMOUNT
───────────────────────────────────────────────────────────────────────────────────────
Client pays via PayMongo           1000 Gateway Rcv      2000 Escrow Payable   ₱1,000

Client releases escrow             2000 Escrow Payable   2100 Earnings Pay     ₱850 ← recognition event
                                   2000 Escrow Payable   4000 Commission Rev   ₱150 ← recognition event

Provider requests payout           2100 Earnings Pay     2400 Payout In-Flight ₱850
Admin sends payout (bank transfer) 2400 Payout In-Flight 1000 Gateway Rcv      ₱850
───────────────────────────────────────────────────────────────────────────────────────
Net: Platform retains ₱150 (commission). Provider received ₱850. Balanced.
```

---

## Account Balances After a Full Job Cycle

| Account | Balance | Explanation |
|---|---|---|
| 1000 Gateway Receivable | ₱0 | ₱1,000 in — ₱850 paid to provider via payout |
| 2000 Escrow Payable | ₱0 | Fully cleared at escrow release |
| 2100 Earnings Payable | ₱0 | Cleared after payout |
| 2400 Payout In-Flight | ₱0 | Cleared when admin confirms bank transfer |
| 4000 Commission Revenue | ₱150 | Platform earned ₱150 on completion |

> **Equation holds:** Assets (₱0) = Liabilities (₱0) + Revenue (₱150) – retained in platform equity ✓

> **Key insight:** The ₱150 commission only ever appears in the books at escrow release (Flow 3),
> never at payment time. If a dispute is resolved as a full client refund before release (Flow 6),
> the books show zero commission entries — no reversal needed.
