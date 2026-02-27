import { cn } from "@/lib/utils";
import type { JobStatus, QuoteStatus, DisputeStatus, EscrowStatus } from "@/types";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  muted: "bg-slate-50 text-slate-500",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export default function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Helpers for domain-specific badge variants
export function JobStatusBadge({ status }: { status: JobStatus }) {
  const config: Record<JobStatus, { variant: BadgeVariant; label: string }> = {
    pending_validation: { variant: "warning", label: "Pending Review" },
    open: { variant: "info", label: "Open" },
    assigned: { variant: "info", label: "Assigned" },
    in_progress: { variant: "warning", label: "In Progress" },
    completed: { variant: "success", label: "Completed" },
    disputed: { variant: "danger", label: "Disputed" },
    rejected: { variant: "muted", label: "Rejected" },
    refunded: { variant: "muted", label: "Refunded" },
    expired: { variant: "muted", label: "Expired" },
  };
  const { variant, label } = config[status] ?? { variant: "default", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export function EscrowBadge({ status }: { status: EscrowStatus }) {
  const config: Record<EscrowStatus, { variant: BadgeVariant; label: string }> = {
    not_funded: { variant: "muted", label: "Not Funded" },
    funded: { variant: "warning", label: "Funded" },
    released: { variant: "success", label: "Released" },
    refunded: { variant: "info", label: "Refunded" },
  };
  const { variant, label } = config[status] ?? { variant: "default", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const config: Record<QuoteStatus, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "warning", label: "Pending" },
    accepted: { variant: "success", label: "Accepted" },
    rejected: { variant: "danger", label: "Rejected" },
  };
  const { variant, label } = config[status] ?? { variant: "default", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
  const config: Record<DisputeStatus, { variant: BadgeVariant; label: string }> = {
    open: { variant: "danger", label: "Open" },
    investigating: { variant: "warning", label: "Investigating" },
    resolved: { variant: "success", label: "Resolved" },
  };
  const { variant, label } = config[status] ?? { variant: "default", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
