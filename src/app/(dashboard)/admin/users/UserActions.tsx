"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CheckCircle2, XCircle, ShieldCheck, ShieldX, Ban, Unlock,
  RotateCcw, MessageCircle, MoreHorizontal, Eye,
} from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";
import MessageUserModal from "./MessageUserModal";

interface Props {
  userId: string;
  userName: string;
  role: string;
  isVerified: boolean;
  isSuspended: boolean;
  approvalStatus: string;
  email?: string;
  phone?: string;
  viewHref?: string;
}

// Explicit action keys — avoids the bug where derived keys like "isVerified_true"
// never matched a plain string comparison in the isLoading check.
type ActionKey = "approve" | "reject" | "re-approve" | "verify" | "unverify" | "suspend" | "unsuspend";

export default function UserActions({ userId, userName, role, isVerified, isSuspended, approvalStatus, email, phone, viewHref }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function act(key: ActionKey, patch: Record<string, unknown>, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return;
    setLoading(key);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success("User updated");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  function close() { setOpen(false); }

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
        aria-label="Actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {/* ── Dropdown panel ───────────────────────────────────────────────── */}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl py-1 flex flex-col">

          {/* View profile */}
          {viewHref && (
            <Link
              href={viewHref}
              onClick={close}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Eye size={13} className="text-slate-400" />
              View profile
            </Link>
          )}

          {/* Message */}
          <DropdownItem
            label="Message"
            icon={<MessageCircle size={13} />}
            className="text-violet-700 dark:text-violet-400"
            loading={false}
            onClick={() => { close(); setShowMessage(true); }}
          />

          <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2 my-1" />

          {/* Provider approval */}
          {role === "provider" && approvalStatus === "pending_approval" && (
            <>
              <DropdownItem
                label="Approve"
                icon={<CheckCircle2 size={13} />}
                className="text-emerald-700 dark:text-emerald-400"
                loading={loading === "approve"}
                onClick={() => act("approve", { approvalStatus: "approved" })}
              />
              <DropdownItem
                label="Reject"
                icon={<XCircle size={13} />}
                className="text-red-600 dark:text-red-400"
                loading={loading === "reject"}
                onClick={() => act("reject", { approvalStatus: "rejected" }, "Reject this provider application? They will be notified.")}
              />
            </>
          )}

          {role === "provider" && approvalStatus === "rejected" && (
            <DropdownItem
              label="Re-approve"
              icon={<RotateCcw size={13} />}
              className="text-emerald-700 dark:text-emerald-400"
              loading={loading === "re-approve"}
              onClick={() => act("re-approve", { approvalStatus: "approved" })}
            />
          )}

          {/* Verify / Unverify */}
          {!isVerified ? (
            <DropdownItem
              label="Verify"
              icon={<ShieldCheck size={13} />}
              className="text-blue-700 dark:text-blue-400"
              loading={loading === "verify"}
              onClick={() => act("verify", { isVerified: true })}
            />
          ) : (
            <DropdownItem
              label="Unverify"
              icon={<ShieldX size={13} />}
              className="text-slate-500 dark:text-slate-400"
              loading={loading === "unverify"}
              onClick={() => act("unverify", { isVerified: false }, "Remove email verification from this user?")}
            />
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-700 mx-2 my-1" />

          {/* Suspend / Unsuspend */}
          {!isSuspended ? (
            <DropdownItem
              label="Suspend"
              icon={<Ban size={13} />}
              className="text-orange-600 dark:text-orange-400"
              loading={loading === "suspend"}
              onClick={() => act("suspend", { isSuspended: true }, "Suspend this account? The user will lose access immediately.")}
            />
          ) : (
            <DropdownItem
              label="Unsuspend"
              icon={<Unlock size={13} />}
              className="text-slate-700 dark:text-slate-300 font-semibold"
              loading={loading === "unsuspend"}
              onClick={() => act("unsuspend", { isSuspended: false })}
            />
          )}
        </div>
      )}

      {showMessage && (
        <MessageUserModal
          userId={userId}
          userName={userName}
          hasEmail={!!email}
          hasPhone={!!phone}
          onClose={() => setShowMessage(false)}
        />
      )}
    </div>
  );
}

// ─── Dropdown menu item ────────────────────────────────────────────────────────

interface DropdownItemProps {
  label: string;
  icon: React.ReactNode;
  className?: string;
  loading: boolean;
  onClick: () => void;
}

function DropdownItem({ label, icon, className = "", loading, onClick }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={[
        "flex w-full items-center gap-2 px-3 py-2 text-xs font-medium",
        "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    >
      {loading
        ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
        : icon}
      {label}
    </button>
  );
}
