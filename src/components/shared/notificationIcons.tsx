import {
  Bell,
  ClipboardList,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  ThumbsDown,
  Wallet,
  BadgeCheck,
  Flag,
  Banknote,
  AlertTriangle,
  Scale,
  Star,
  MessageSquare,
  Ban,
  Clock,
  Coins,
  BellRing,
  Landmark,
  CircleDollarSign,
  UserCheck,
  PlayCircle,
  Timer,
  PenLine,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

export type IconConfig = { icon: LucideIcon; bg: string; color: string };

export const TYPE_ICON: Record<string, IconConfig> = {
  job_submitted:     { icon: ClipboardList,  bg: "bg-blue-100",    color: "text-blue-600"    },
  job_approved:      { icon: CheckCircle2,   bg: "bg-emerald-100", color: "text-emerald-600" },
  job_rejected:      { icon: XCircle,        bg: "bg-red-100",     color: "text-red-600"     },
  quote_received:    { icon: FileText,        bg: "bg-violet-100",  color: "text-violet-600"  },
  quote_accepted:    { icon: Sparkles,        bg: "bg-amber-100",   color: "text-amber-600"   },
  quote_rejected:    { icon: ThumbsDown,      bg: "bg-slate-100",   color: "text-slate-500"   },
  escrow_funded:     { icon: Wallet,          bg: "bg-emerald-100", color: "text-emerald-600" },
  payment_confirmed: { icon: BadgeCheck,      bg: "bg-emerald-100", color: "text-emerald-600" },
  job_completed:     { icon: Flag,            bg: "bg-blue-100",    color: "text-blue-600"    },
  escrow_released:   { icon: Banknote,        bg: "bg-emerald-100", color: "text-emerald-600" },
  dispute_opened:    { icon: AlertTriangle,   bg: "bg-amber-100",   color: "text-amber-600"   },
  dispute_resolved:  { icon: Scale,           bg: "bg-blue-100",    color: "text-blue-600"    },
  review_received:   { icon: Star,            bg: "bg-amber-100",   color: "text-amber-500"   },
  new_message:       { icon: MessageSquare,   bg: "bg-sky-100",     color: "text-sky-600"     },
  payment_failed:         { icon: Ban,      bg: "bg-red-100",    color: "text-red-600"    },
  job_expired:            { icon: Clock,    bg: "bg-slate-100",  color: "text-slate-500"  },
  escrow_auto_released:   { icon: Coins,    bg: "bg-emerald-100",color: "text-emerald-600"},
  quote_expired:          { icon: Clock,    bg: "bg-slate-100",  color: "text-slate-500"  },
  reminder_fund_escrow:   { icon: BellRing,          bg: "bg-amber-100",   color: "text-amber-600"   },
  reminder_no_quotes:     { icon: BellRing,          bg: "bg-amber-100",   color: "text-amber-600"   },
  payout_requested:       { icon: Landmark,           bg: "bg-violet-100",  color: "text-violet-600"  },
  payout_status_update:   { icon: CircleDollarSign,   bg: "bg-emerald-100", color: "text-emerald-600" },
  job_direct_invite:      { icon: UserCheck,          bg: "bg-indigo-100",  color: "text-indigo-600"  },
  reminder_start_job:     { icon: PlayCircle,         bg: "bg-orange-100",  color: "text-orange-600"  },
  reminder_complete_job:  { icon: Timer,              bg: "bg-orange-100",  color: "text-orange-600"  },
  reminder_leave_review:  { icon: PenLine,            bg: "bg-amber-100",   color: "text-amber-600"   },
  reminder_stale_dispute: { icon: ShieldAlert,        bg: "bg-red-100",     color: "text-red-600"     },
};

const FALLBACK: IconConfig = { icon: Bell, bg: "bg-slate-100", color: "text-slate-500" };

const SIZE = {
  sm: { wrap: "w-8 h-8", icon: "h-3.5 w-3.5" },
  md: { wrap: "w-9 h-9", icon: "h-4 w-4" },
};

export function NotifIcon({ type, size = "sm" }: { type: string; size?: "sm" | "md" }) {
  const cfg = TYPE_ICON[type] ?? FALLBACK;
  const Icon = cfg.icon;
  const { wrap, icon } = SIZE[size];
  return (
    <div className={`${wrap} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
      <Icon className={`${icon} ${cfg.color}`} />
    </div>
  );
}
