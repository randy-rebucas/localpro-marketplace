"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  totalIn: number;
  totalOut: number;
}

export default function WalletLedgerFooter({ totalIn, totalOut }: Props) {
  const [open, setOpen] = useState(false);
  const net = totalIn - totalOut;

  return (
    <div className="border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-2.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="font-medium">Summary</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="px-6 py-3 bg-slate-50 grid grid-cols-3 gap-4 border-t border-slate-100 text-xs text-slate-500">
          <div>
            <p className="uppercase tracking-wide font-medium text-slate-400 mb-0.5">Total In</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalIn)}</p>
          </div>
          <div>
            <p className="uppercase tracking-wide font-medium text-slate-400 mb-0.5">Total Out</p>
            <p className="text-sm font-bold text-rose-600">{formatCurrency(totalOut)}</p>
          </div>
          <div>
            <p className="uppercase tracking-wide font-medium text-slate-400 mb-0.5">Net</p>
            <p className={`text-sm font-bold ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {formatCurrency(net)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
