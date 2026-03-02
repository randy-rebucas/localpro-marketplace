"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle, ShieldCheck, ShieldX, Ban, Unlock, RotateCcw, MessageCircle } from "lucide-react";
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
}

// Explicit action keys — avoids the bug where derived keys like "isVerified_true"
// never matched a plain string comparison in the isLoading check.
type ActionKey = "approve" | "reject" | "re-approve" | "verify" | "unverify" | "suspend" | "unsuspend";

export default function UserActions({ userId, userName, role, isVerified, isSuspended, approvalStatus, email, phone }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [showMessage, setShowMessage] = useState(false);

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

  return (
    <div className="flex flex-wrap items-center gap-1.5">

      {/* ── Message ───────────────────────────────────────────────────────── */}
      <ActionBtn
        label="Message"
        icon={<MessageCircle size={13} />}
        colorClass="border border-violet-300 text-violet-700 hover:bg-violet-50"
        loading={false}
        onClick={() => setShowMessage(true)}
      />

      {showMessage && (
        <MessageUserModal
          userId={userId}
          userName={userName}
          hasEmail={!!email}
          hasPhone={!!phone}
          onClose={() => setShowMessage(false)}
        />
      )}

      {/* ── Provider approval ──────────────────────────────────────────── */}
      {role === "provider" && approvalStatus === "pending_approval" && (
        <>
          <ActionBtn
            label="Approve"
            icon={<CheckCircle2 size={13} />}
            colorClass="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            loading={loading === "approve"}
            onClick={() => act("approve", { approvalStatus: "approved" })}
          />
          <ActionBtn
            label="Reject"
            icon={<XCircle size={13} />}
            colorClass="border border-red-300 text-red-600 hover:bg-red-50"
            loading={loading === "reject"}
            onClick={() =>
              act(
                "reject",
                { approvalStatus: "rejected" },
                "Reject this provider application? They will be notified."
              )
            }
          />
        </>
      )}

      {role === "provider" && approvalStatus === "rejected" && (
        <ActionBtn
          label="Re-approve"
          icon={<RotateCcw size={13} />}
          colorClass="border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          loading={loading === "re-approve"}
          onClick={() => act("re-approve", { approvalStatus: "approved" })}
        />
      )}

      {/* ── Email verification ────────────────────────────────────────── */}
      {!isVerified ? (
        <ActionBtn
          label="Verify"
          icon={<ShieldCheck size={13} />}
          colorClass="border border-blue-300 text-blue-700 hover:bg-blue-50"
          loading={loading === "verify"}
          onClick={() => act("verify", { isVerified: true })}
        />
      ) : (
        <ActionBtn
          label="Unverify"
          icon={<ShieldX size={13} />}
          colorClass="border border-slate-300 text-slate-500 hover:bg-slate-50"
          loading={loading === "unverify"}
          onClick={() =>
            act(
              "unverify",
              { isVerified: false },
              "Remove email verification from this user?"
            )
          }
        />
      )}

      {/* ── Suspend / unsuspend ──────────────────────────────────────── */}
      {!isSuspended ? (
        <ActionBtn
          label="Suspend"
          icon={<Ban size={13} />}
          colorClass="border border-orange-300 text-orange-600 hover:bg-orange-50"
          loading={loading === "suspend"}
          onClick={() =>
            act(
              "suspend",
              { isSuspended: true },
              "Suspend this account? The user will lose access immediately."
            )
          }
        />
      ) : (
        <ActionBtn
          label="Unsuspend"
          icon={<Unlock size={13} />}
          colorClass="bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
          loading={loading === "unsuspend"}
          onClick={() => act("unsuspend", { isSuspended: false })}
        />
      )}
    </div>
  );
}

// ─── Shared small action button ────────────────────────────────────────────────

interface ActionBtnProps {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  loading: boolean;
  onClick: () => void;
}

function ActionBtn({ label, icon, colorClass, loading, onClick }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={[
        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium",
        "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        colorClass,
      ].join(" ")}
    >
      {loading
        ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
        : icon}
      {label}
    </button>
  );
}
