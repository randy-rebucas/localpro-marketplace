import mongoose, { Schema, Document, Model } from "mongoose";

export const ACCOUNT_CODES = {
  // Assets
  GATEWAY_RECEIVABLE:       "1000",
  ESCROW_HELD:              "1100",
  WALLET_FUNDS_HELD:        "1200",
  // Liabilities
  ESCROW_PAYABLE_CLIENTS:   "2000",
  EARNINGS_PAYABLE:         "2100",
  WALLET_PAYABLE_CLIENTS:   "2200",
  WITHDRAWAL_PAYABLE:       "2300",
  PAYOUT_IN_FLIGHT:          "2400",
  // Equity
  PLATFORM_EQUITY:          "3000",
  // Revenue
  COMMISSION_REVENUE:       "4000",
  SUBSCRIPTION_REVENUE:     "4100",
  LATE_FEE_REVENUE:         "4200",
  // Expenses
  REFUNDS_ISSUED:           "5000",
  PAYMENT_PROCESSING_FEES:  "5100",
  BAD_DEBT:                 "5200",
} as const;

export type AccountCode = (typeof ACCOUNT_CODES)[keyof typeof ACCOUNT_CODES];

export const ACCOUNT_NAMES: Record<AccountCode, string> = {
  "1000": "Gateway Receivable",
  "1100": "Escrow Held",
  "1200": "Wallet Funds Held",
  "2000": "Escrow Payable — Clients",
  "2100": "Earnings Payable — Providers",
  "2200": "Wallet Payable — Clients",
  "2300": "Withdrawal Payable — Clients",
  "2400": "Payout In-Flight — Providers",
  "3000": "Platform Equity",
  "4000": "Commission Revenue",
  "4100": "Subscription Revenue",
  "4200": "Late Fee Revenue",
  "5000": "Refunds Issued",
  "5100": "Payment Processing Fees",
  "5200": "Bad Debt / Write-offs",
};

export const ACCOUNT_TYPES: Record<AccountCode, "asset" | "liability" | "equity" | "revenue" | "expense"> = {
  "1000": "asset",
  "1100": "asset",
  "1200": "asset",
  "2000": "liability",
  "2100": "liability",
  "2200": "liability",
  "2300": "liability",
  "2400": "liability",
  "3000": "equity",
  "4000": "revenue",
  "4100": "revenue",
  "4200": "revenue",
  "5000": "expense",
  "5100": "expense",
  "5200": "expense",
};

export type LedgerEntryType =
  | "escrow_funded_gateway"
  | "escrow_funded_wallet"
  | "commission_accrued"
  | "earnings_earmarked"
  | "escrow_released"
  | "payout_requested"
  | "payout_sent"
  | "payout_rejected"
  | "wallet_funded_gateway"
  | "wallet_debited_escrow"
  | "wallet_withdrawal_requested"
  | "wallet_withdrawal_completed"
  | "wallet_withdrawal_reversed"
  | "dispute_refund_commission"
  | "dispute_refund_earnings"
  | "dispute_release"
  | "partial_release"
  | "milestone_release"
  | "admin_credit"
  | "admin_debit"
  | "reversal";

export type LedgerEntityType =
  | "job"
  | "payout"
  | "payment"
  | "wallet_withdrawal"
  | "wallet_topup"
  | "dispute"
  | "transaction"
  | "recurring_schedule"
  | "manual";

export interface ILedgerEntry {
  _id?: mongoose.Types.ObjectId;
  journalId: string;
  entryType: LedgerEntryType;
  debitAccount: AccountCode;
  creditAccount: AccountCode;
  /** Always stored as integer centavos (amount × 100) */
  amountCentavos: number;
  currency: string;
  entityType: LedgerEntityType;
  entityId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId | null;
  providerId: mongoose.Types.ObjectId | null;
  initiatedBy: mongoose.Types.ObjectId;
  description: string;
  reversedBy: string | null;
  reversalOf: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface LedgerEntryDocument extends Omit<ILedgerEntry, "_id">, Document {}

const LedgerEntrySchema = new Schema<LedgerEntryDocument>(
  {
    journalId: { type: String, required: true, index: true },

    entryType: {
      type: String,
      required: true,
      enum: [
        "escrow_funded_gateway",
        "escrow_funded_wallet",
        "commission_accrued",
        "earnings_earmarked",
        "escrow_released",
        "payout_requested",
        "payout_sent",
        "payout_rejected",
        "wallet_funded_gateway",
        "wallet_debited_escrow",
        "wallet_withdrawal_requested",
        "wallet_withdrawal_completed",
        "wallet_withdrawal_reversed",
        "dispute_refund_commission",
        "dispute_refund_earnings",
        "dispute_release",
        "partial_release",
        "milestone_release",
        "admin_credit",
        "admin_debit",
        "reversal",
      ] as LedgerEntryType[],
    },

    debitAccount: {
      type: String,
      required: true,
      enum: Object.values(ACCOUNT_CODES),
    },
    creditAccount: {
      type: String,
      required: true,
      enum: Object.values(ACCOUNT_CODES),
    },

    amountCentavos: { type: Number, required: true, min: 0 },
    currency:       { type: String, required: true, default: "PHP" },

    entityType: {
      type: String,
      required: true,
      enum: ["job", "payout", "payment", "wallet_withdrawal", "wallet_topup", "dispute", "transaction", "recurring_schedule", "manual"] as LedgerEntityType[],
    },
    entityId: { type: Schema.Types.ObjectId, required: true },

    clientId:    { type: Schema.Types.ObjectId, ref: "User", default: null },
    providerId:  { type: Schema.Types.ObjectId, ref: "User", default: null },
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    description: { type: String, required: true },

    reversedBy: { type: String, default: null },
    reversalOf: { type: String, default: null },

    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable — never updated
    collection: "ledger_entries",
  }
);

LedgerEntrySchema.index({ entityType: 1, entityId: 1 });
LedgerEntrySchema.index({ debitAccount: 1, createdAt: -1 });
LedgerEntrySchema.index({ creditAccount: 1, createdAt: -1 });
LedgerEntrySchema.index({ clientId: 1, createdAt: -1 });
LedgerEntrySchema.index({ providerId: 1, createdAt: -1 });
LedgerEntrySchema.index({ currency: 1, createdAt: -1 });
LedgerEntrySchema.index({ entryType: 1, createdAt: -1 });

const LedgerEntry: Model<LedgerEntryDocument> =
  mongoose.models.LedgerEntry ??
  mongoose.model<LedgerEntryDocument>("LedgerEntry", LedgerEntrySchema);

export default LedgerEntry;
