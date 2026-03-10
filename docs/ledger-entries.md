# Ledger Entries per Flow

All amounts stored as **centavos** (integer). Examples use ₱1,000 budget at 15% commission → commission ₱150, provider net ₱850.

---

## Chart of Accounts (Quick Reference)

| Code | Account | Type |
|---|---|---|
| 1000 | Gateway Receivable | Asset |
| 1100 | Escrow Held | Asset |
| 1200 | Wallet Funds Held | Asset |
| 2100 | Earnings Payable — Providers | Liability |
| 2200 | Wallet Payable — Clients | Liability |
| 2300 | Withdrawal Payable | Liability |
| 4000 | Commission Revenue | Revenue |
| 5000 | Refunds Issued | Expense |

---

## Flow 1 — Client Pays Escrow via PayMongo

**Trigger:** Webhook `checkout_session.payment.paid`
**Journal:** `escrow-fund-{jobId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `escrow_funded_gateway` | 1000 Gateway Receivable | 2100 Earnings Payable | ₱850 (net) |
| 2 | `commission_accrued` | 1000 Gateway Receivable | 4000 Commission Revenue | ₱150 (commission) |

**Effect:** Platform holds ₱1,000. Provider is owed ₱850. Platform earns ₱150.

---

## Flow 2 — Client Pays Escrow from Wallet

**Trigger:** Client clicks "Fund from Wallet"
**Journal:** `escrow-fund-{jobId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `escrow_funded_wallet` | 2200 Wallet Payable | 2100 Earnings Payable | ₱850 (net) |
| 2 | `commission_accrued` | 2200 Wallet Payable | 4000 Commission Revenue | ₱150 (commission) |

**Effect:** Client wallet liability reduces by ₱1,000. Provider is owed ₱850. Platform earns ₱150.

---

## Flow 3 — Client Releases Escrow (Job Complete)

**Trigger:** Client clicks "Release Payment"
**Journal:** `escrow-release-{jobId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `escrow_released` | 2100 Earnings Payable | 2100 Earnings Payable | ₱850 (net) |

> Commission was already recognized at funding time. This is an **audit marker only** — confirms earnings are cleared for payout.

---

## Flow 4 — Admin Sends Provider Payout

**Trigger:** Admin marks payout as `completed`
**Journal:** `payout-{payoutId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `payout_sent` | 2100 Earnings Payable | 1000 Gateway Receivable | ₱850 |

**Effect:** Provider liability cleared. Cash leaves the platform.

---

## Flow 5 — Dispute Resolved: Full Refund to Client

**Trigger:** Admin resolves dispute in client's favour
**Journal:** `dispute-{disputeId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `dispute_refund_commission` | 4000 Commission Revenue | 2200 Wallet Payable | ₱150 (commission) |
| 2 | `dispute_refund_earnings` | 2100 Earnings Payable | 2200 Wallet Payable | ₱850 (net) |

**Effect:** Commission reversed. Provider earnings reversed. Client wallet credited ₱1,000 total.

---

## Flow 6 — Dispute Resolved: Provider Keeps Earnings

**Trigger:** Admin resolves dispute in provider's favour
**Journal:** `dispute-{disputeId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `dispute_release` | 2100 Earnings Payable | 2100 Earnings Payable | ₱850 (net) |

> Audit marker only. No money changes hands — earnings were already posted at escrow funding.

---

## Flow 7 — Client Requests Wallet Withdrawal

**Trigger:** Client submits withdrawal request
**Journal:** `withdrawal-{withdrawalId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `wallet_withdrawal_requested` | 2200 Wallet Payable | 2300 Withdrawal Payable | ₱500 |

**Effect:** Wallet liability converts to an in-flight withdrawal liability.

---

## Flow 8 — Admin Completes Wallet Withdrawal

**Trigger:** Admin marks withdrawal as `completed`
**Journal:** `withdrawal-{withdrawalId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `wallet_withdrawal_completed` | 2300 Withdrawal Payable | 1000 Gateway Receivable | ₱500 |

**Effect:** In-flight liability cleared. Cash leaves the platform.

---

## Flow 9 — Admin Rejects Wallet Withdrawal

**Trigger:** Admin marks withdrawal as `rejected`
**Journal:** `withdrawal-{withdrawalId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `wallet_withdrawal_reversed` | 2300 Withdrawal Payable | 2200 Wallet Payable | ₱500 |

**Effect:** In-flight liability reversed. Client wallet restored.

---

## Flow 10 — Client Tops Up Wallet (via PayMongo)

**Trigger:** Client completes wallet top-up checkout
**Journal:** `wallet-topup-{userId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `wallet_funded_gateway` | 1000 Gateway Receivable | 2200 Wallet Payable | ₱500 |

**Effect:** Cash received. Client wallet balance increases.

---

## Flow 11 — Admin Manual Credit

**Trigger:** Admin issues goodwill or compensation credit
**Journal:** `admin-credit-{userId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `admin_credit` | 1000 Gateway Receivable | 2200 Wallet Payable | amount |

---

## Flow 12 — Admin Manual Debit

**Trigger:** Admin claws back or corrects a balance
**Journal:** `admin-debit-{userId}`

| # | Entry Type | Debit | Credit | Amount |
|---|---|---|---|---|
| 1 | `admin_debit` | 2200 Wallet Payable | 1000 Gateway Receivable | amount |

---

## Full Journey Summary (₱1,000 job, 15% commission)

```
EVENT                          DR                  CR                  AMOUNT
─────────────────────────────────────────────────────────────────────────────
Client pays via PayMongo       1000 Gateway Rcv    2100 Earnings Pay    ₱850
                               1000 Gateway Rcv    4000 Commission Rev  ₱150

Client releases escrow         2100 Earnings Pay   2100 Earnings Pay    ₱850 *

Admin sends payout             2100 Earnings Pay   1000 Gateway Rcv     ₱850
─────────────────────────────────────────────────────────────────────────────
Net: Platform retains ₱150 (commission). Provider received ₱850. Balanced.
```

`*` Audit marker — same account debit/credit, no net movement.

---

## Account Balances After a Full Job Cycle

| Account | Balance | Explanation |
|---|---|---|
| 1000 Gateway Receivable | ₱0 | ₱1,000 in, ₱850 out via payout |
| 4000 Commission Revenue | ₱150 | Platform earned ₱150 |
| 2100 Earnings Payable | ₱0 | Cleared after payout |

> **Equation holds:** Assets (₱0) = Liabilities (₱0) + Revenue (₱150) − implicit equity retention ✓
