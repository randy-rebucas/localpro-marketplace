import mongoose, { Schema, Document, Model } from "mongoose";
import type { AccountCode } from "./LedgerEntry";

export interface IAccountBalance {
  _id?: mongoose.Types.ObjectId;
  accountCode: AccountCode;
  currency: string;
  /** Stored as integer centavos */
  balance: number;
  /** Timestamp of last recomputation */
  asOf: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountBalanceDocument extends Omit<IAccountBalance, "_id">, Document {}

const AccountBalanceSchema = new Schema<AccountBalanceDocument>(
  {
    accountCode: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "PHP",
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    asOf: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

AccountBalanceSchema.index({ accountCode: 1, currency: 1 }, { unique: true });

const AccountBalance: Model<AccountBalanceDocument> =
  mongoose.models.AccountBalance ??
  mongoose.model<AccountBalanceDocument>("AccountBalance", AccountBalanceSchema);

export default AccountBalance;
