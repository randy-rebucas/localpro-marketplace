"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import {
  ArrowLeft, CheckCircle2, XCircle, Mail, Phone, MapPin,
  Star, Briefcase, Clock, FileText, BadgeCheck, AlertCircle,
  UserCheck, KeyRound, Shield, Activity, FileDown, Trash2,
  ExternalLink, ChevronDown,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { IUser, IProviderProfile } from "@/types";
import UserActions from "../UserActions";
import KycActions from "./KycActions";
import EditRoleModal from "./EditRoleModal";
import ActivityDrawer from "./ActivityDrawer";

interface Props {
  user: IUser;
  providerProfile: IProviderProfile | null;
}

// ─── Completeness ──────────────────────────────────────────────────────────

interface CompletenessItem { label: string; done: boolean }

function getCompleteness(u: IUser) {
  const base: CompletenessItem[] = [
    { label: "Email verified", done: u.isVerified },
    { label: "Phone number",   done: !!u.phone },
    { label: "Profile photo",  done: !!u.avatar },
  ];
  const extra: CompletenessItem[] =
    u.role === "provider"
      ? [
          { label: "KYC submitted", done: !!u.kycStatus && u.kycStatus !== "none" },
          { label: "KYC approved",  done: u.kycStatus === "approved" },
        ]
      : [{ label: "Address saved", done: (u.addresses?.length ?? 0) > 0 }];

  const items = [...base, ...extra];
  const pct = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { items, pct };
}

function completenessColor(pct: number) {
  if (pct === 100) return { bar: "bg-emerald-500", text: "text-emerald-700" };
  if (pct >= 60)   return { bar: "bg-violet-500",  text: "text-violet-700"  };
  if (pct >= 40)   return { bar: "bg-amber-400",   text: "text-amber-700"   };
  return               { bar: "bg-red-400",     text: "text-red-700"     };
}

// ─── KYC stepper ──────────────────────────────────────────────────────────

const KYC_STEPS = ["none", "pending", "approved"] as const;

const KYC_STEP_LABEL: Record<string, string> = {
  none:     "Not submitted",
  pending:  "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

const KYC_STEP_COLOR: Record<string, { dot: string; text: string; badge: string }> = {
  none:     { dot: "bg-slate-200",   text: "text-slate-400",  badge: "bg-slate-100  text-slate-500"  },
  pending:  { dot: "bg-amber-400",   text: "text-amber-700",  badge: "bg-amber-100  text-amber-700"  },
  approved: { dot: "bg-emerald-500", text: "text-emerald-700",badge: "bg-emerald-100 text-emerald-700"},
  rejected: { dot: "bg-red-500",     text: "text-red-700",    badge: "bg-red-100    text-red-700"    },
};

function KycStepper({ status }: { status: string }) {
  const isRejected = status === "rejected";
  const activeIdx = isRejected ? 1 : KYC_STEPS.indexOf(status as typeof KYC_STEPS[number]);
  const c = KYC_STEP_COLOR[status] ?? KYC_STEP_COLOR.none;

  return (
    <div className="space-y-2">
      {/* Step track */}
      <div className="flex items-center gap-0">
        {KYC_STEPS.map((step, idx) => {
          const done  = !isRejected && idx < activeIdx;
          const active = isRejected ? idx === 1 : idx === activeIdx;
          const stepC = done ? KYC_STEP_COLOR.approved : active ? KYC_STEP_COLOR[status] : KYC_STEP_COLOR.none;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${stepC.dot} ring-2 ring-white`}>
                {done
                  ? <CheckCircle2 size={12} className="text-white" />
                  : active && isRejected
                    ? <XCircle size={12} className="text-white" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
              </div>
              {idx < KYC_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 rounded-full ${done ? "bg-emerald-400" : "bg-slate-100"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px]">
        {KYC_STEPS.map((step, idx) => {
          const done  = !isRejected && idx < activeIdx;
          const active = isRejected ? idx === 1 : idx === activeIdx;
          return (
            <span
              key={step}
              className={
                done  ? "text-emerald-600 font-medium" :
                active ? `${KYC_STEP_COLOR[status].text} font-semibold` :
                "text-slate-400"
              }
            >
              {isRejected && idx === 1 ? "Rejected" : KYC_STEP_LABEL[step]}
            </span>
          );
        })}
      </div>

      {/* Current status badge */}
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
        {status === "approved" && <CheckCircle2 size={11} />}
        {status === "rejected" && <XCircle size={11} />}
        {status === "pending"  && <AlertCircle size={11} />}
        {KYC_STEP_LABEL[status] ?? status}
      </span>
    </div>
  );
}

// ─── Layout helpers ────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  admin:    "bg-purple-100 text-purple-700",
  provider: "bg-blue-100 text-blue-700",
  client:   "bg-slate-100 text-slate-700",
  staff:    "bg-indigo-100 text-indigo-700",
};

const APPROVAL_COLOR: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-700",
  approved:         "bg-green-100 text-green-700",
  rejected:         "bg-red-100 text-red-700",
};

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {action}
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
      <span className="text-xs text-slate-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-800 flex-1">
        {value == null || value === "" ? <span className="text-slate-300 italic">—</span> : value}
      </span>
    </div>
  );
}

// ─── Duplicate row interface ───────────────────────────────────────────────

interface DupUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified?: boolean;
  createdAt?: string | Date;
}

// ─── Main component ────────────────────────────────────────────────────────

export default function UserDetailView({ user, providerProfile }: Props) {
  const router = useRouter();
  const { items: completenessItems, pct } = getCompleteness(user);
  const c = completenessColor(pct);
  const initials = user.name.split(" ").filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const approvalStatus = user.approvalStatus ?? "approved";
  const kycStatus = user.kycStatus ?? "none";
  const userId = String(user._id);

  // ── Modal / drawer state ────────────────────────────────────────────
  const [showEditRole, setShowEditRole] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  // ── Loading state for admin actions ────────────────────────────────
  const [loadingImpersonate, setLoadingImpersonate] = useState(false);
  const [loadingReset,       setLoadingReset]       = useState(false);
  const [loadingDelete,      setLoadingDelete]      = useState(false);

  // ── Duplicate detection ────────────────────────────────────────────
  const [duplicates,        setDuplicates]        = useState<DupUser[] | null>(null);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [dupExpanded,       setDupExpanded]       = useState(false);

  const loadDuplicates = useCallback(async () => {
    if (duplicates !== null) { setDupExpanded((v) => !v); return; }
    setLoadingDuplicates(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/duplicates`);
      const data = await res.json();
      if (res.ok) { setDuplicates(data.duplicates ?? []); setDupExpanded(true); }
    } finally {
      setLoadingDuplicates(false);
    }
  }, [userId, duplicates]);

  // ── Impersonate ─────────────────────────────────────────────────────
  async function handleImpersonate() {
    if (!confirm(`Impersonate "${user.name}"? You will be logged in as this user.`)) return;
    setLoadingImpersonate(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/impersonate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to impersonate"); return; }
      toast.success(`Now impersonating ${user.name}`);
      router.push(data.redirectTo ?? "/provider/dashboard");
    } catch { toast.error("Something went wrong"); }
    finally { setLoadingImpersonate(false); }
  }

  // ── Password reset trigger ──────────────────────────────────────────
  async function handlePasswordReset() {
    if (!confirm(`Send password reset email to "${user.email}"?`)) return;
    setLoadingReset(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to send reset email"); return; }
      toast.success("Password reset email sent.");
    } catch { toast.error("Something went wrong"); }
    finally { setLoadingReset(false); }
  }

  // ── Soft delete ─────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm(`Soft-delete "${user.name}"? This will permanently deactivate their account.`)) return;
    setLoadingDelete(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/delete`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to delete user"); return; }
      toast.success("User deactivated.");
      router.push("/admin/users");
    } catch { toast.error("Something went wrong"); }
    finally { setLoadingDelete(false); }
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Users
      </Link>

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user.avatar
              ? <Image src={user.avatar} alt={user.name} width={64} height={64} className="object-cover w-full h-full rounded-2xl" />
              : <span className="text-2xl font-bold text-primary">{initials}</span>}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <span className={`badge capitalize ${ROLE_COLOR[user.role] ?? "bg-slate-100 text-slate-600"}`}>
                {user.role}
              </span>
              {user.isVerified && (
                <span className="badge bg-green-100 text-green-700 inline-flex items-center gap-1">
                  <BadgeCheck size={11} /> Verified
                </span>
              )}
              {user.isSuspended && <span className="badge bg-red-100 text-red-700">Suspended</span>}
              {user.role === "provider" && (
                <span className={`badge capitalize ${APPROVAL_COLOR[approvalStatus] ?? "bg-slate-100 text-slate-500"}`}>
                  {approvalStatus.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Mail size={13} className="text-slate-400 flex-shrink-0" /> {user.email}
            </p>
            {user.phone && (
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Phone size={13} className="text-slate-400 flex-shrink-0" /> {user.phone}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1.5">Joined {formatDate(user.createdAt)}</p>
          </div>

          {/* Quick status actions */}
          <div className="flex-shrink-0">
            <UserActions
              userId={userId}
              userName={user.name}
              role={user.role}
              isVerified={user.isVerified}
              isSuspended={user.isSuspended}
              approvalStatus={approvalStatus}
              email={user.email}
              phone={user.phone ?? undefined}
            />
          </div>
        </div>

        {/* ── Admin action bar ─────────────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            onClick={handleImpersonate}
            disabled={loadingImpersonate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            {loadingImpersonate ? <span className="h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" /> : <UserCheck size={13} />}
            Impersonate
          </button>
          <button
            onClick={handlePasswordReset}
            disabled={loadingReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            {loadingReset ? <span className="h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" /> : <KeyRound size={13} />}
            Reset Password
          </button>
          <button
            onClick={() => setShowEditRole(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Shield size={13} /> Edit Role
          </button>
          <button
            onClick={() => setShowActivity(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Activity size={13} /> Activity Log
          </button>
          <a
            href={`/api/admin/users/${userId}/gdpr-export`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <FileDown size={13} /> GDPR Export
          </a>
          <button
            onClick={loadDuplicates}
            disabled={loadingDuplicates}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            {loadingDuplicates ? <span className="h-3 w-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" /> : <ChevronDown size={13} className={`transition-transform ${dupExpanded ? "rotate-180" : ""}`} />}
            Duplicates
            {duplicates !== null && duplicates.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">{duplicates.length}</span>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={loadingDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
          >
            {loadingDelete ? <span className="h-3 w-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" /> : <Trash2 size={13} />}
            Delete Account
          </button>
        </div>

        {/* ── Duplicates panel ─────────────────────────────────────────────── */}
        {dupExpanded && duplicates !== null && (
          <div className="mt-4 border border-amber-200 rounded-xl bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800 mb-3">
              {duplicates.length === 0
                ? "No potential duplicates found."
                : `${duplicates.length} potential duplicate account(s):`}
            </p>
            {duplicates.length > 0 && (
              <div className="space-y-2">
                {duplicates.map((dup) => (
                  <div key={dup._id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800">{dup.name}</p>
                      <p className="text-[11px] text-slate-400">{dup.email} · <span className="capitalize">{dup.role}</span></p>
                    </div>
                    <Link href={`/admin/users/${dup._id}`} className="ml-3 text-xs text-primary hover:underline inline-flex items-center gap-0.5 flex-shrink-0">
                      View <ExternalLink size={10} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile completeness */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-600">Profile completeness</span>
            <span className={`text-xs font-semibold tabular-nums ${c.text}`}>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {completenessItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs">
                {item.done
                  ? <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                  : <XCircle      size={13} className="text-slate-300    flex-shrink-0" />}
                <span className={item.done ? "text-slate-700" : "text-slate-400"}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Detail grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account details */}
        <Section
          title="Account Details"
          action={
            <button onClick={() => setShowEditRole(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Shield size={11} /> Edit Role
            </button>
          }
        >
          <div className="divide-y divide-slate-50">
            <InfoRow label="User ID" value={
              <code className="text-xs bg-slate-50 px-1.5 py-0.5 rounded font-mono">{userId}</code>
            } />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone} />
            <InfoRow label="Role" value={
              <span className={`badge capitalize ${ROLE_COLOR[user.role]}`}>{user.role}</span>
            } />
            {user.role === "staff" && ((user as { capabilities?: string[] }).capabilities ?? []).length > 0 && (
              <InfoRow label="Capabilities" value={
                <div className="flex flex-wrap gap-1">
                  {((user as { capabilities?: string[] }).capabilities ?? []).map((cap) => (
                    <span key={cap} className="badge text-[10px] bg-indigo-50 text-indigo-700">{cap.replace(/_/g, " ")}</span>
                  ))}
                </div>
              } />
            )}
            <InfoRow label="Email verified" value={user.isVerified ? "Yes" : "No"} />
            <InfoRow label="Suspended"      value={user.isSuspended ? "Yes" : "No"} />
            {user.role === "provider" && (
              <InfoRow label="Approval" value={
                <span className={`badge capitalize ${APPROVAL_COLOR[approvalStatus]}`}>
                  {approvalStatus.replace(/_/g, " ")}
                </span>
              } />
            )}
            <InfoRow label="Registered"   value={formatDate(user.createdAt)} />
            <InfoRow label="Last updated" value={formatDate(user.updatedAt)} />
          </div>
        </Section>

        {/* ── KYC section (providers only) ─────────────────────────────── */}
        {user.role === "provider" && (
          <Section title="KYC / Identity Verification">
            {/* Stepper */}
            <div className="mb-5">
              <KycStepper status={kycStatus} />
            </div>

            {/* Rejection reason callout */}
            {kycStatus === "rejected" && user.kycRejectionReason && (
              <div className="mb-4 flex gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                <XCircle size={13} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Rejection reason given to provider</p>
                  <p className="text-red-600">{user.kycRejectionReason}</p>
                </div>
              </div>
            )}

            {/* Documents */}
            {(user.kycDocuments?.length ?? 0) > 0 ? (
              <div className="space-y-2 mb-5">
                <p className="text-xs font-medium text-slate-500">Submitted Documents</p>
                {user.kycDocuments!.map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-slate-700 capitalize">
                          {doc.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Uploaded {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline flex-shrink-0"
                    >
                      View ↗
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mb-5">No documents submitted yet.</p>
            )}

            {/* Approve / Reject actions */}
            <KycActions userId={userId} kycStatus={kycStatus} />
          </Section>
        )}

        {/* Addresses (clients) */}
        {user.role === "client" && (
          <Section title="Saved Addresses">
            {(user.addresses?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {user.addresses!.map((addr) => (
                  <div
                    key={addr._id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <MapPin size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="badge text-[10px] bg-primary/10 text-primary">Default</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{addr.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No addresses saved.</p>
            )}
          </Section>
        )}

        {/* Provider profile */}
        {user.role === "provider" && providerProfile && (
          <Section title="Provider Profile">
            <div className="divide-y divide-slate-50">
              <div className="pb-3">
                <p className="text-xs font-medium text-slate-400 mb-1">Bio</p>
                <p className="text-sm text-slate-700">
                  {providerProfile.bio || <span className="italic text-slate-300">No bio yet</span>}
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 py-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-bold text-slate-900">{providerProfile.avgRating.toFixed(1)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Avg Rating</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Briefcase size={13} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-900">{providerProfile.completedJobCount}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Jobs Done</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Clock size={13} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-900">{providerProfile.completionRate}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Completion</p>
                </div>
              </div>

              <InfoRow label="Experience" value={`${providerProfile.yearsExperience} yr${providerProfile.yearsExperience !== 1 ? "s" : ""}`} />
              {providerProfile.hourlyRate != null && (
                <InfoRow label="Hourly rate" value={`₱${providerProfile.hourlyRate.toLocaleString()}`} />
              )}
              <InfoRow label="Availability" value={
                <span className={`badge capitalize ${
                  providerProfile.availabilityStatus === "available" ? "bg-green-100 text-green-700"  :
                  providerProfile.availabilityStatus === "busy"      ? "bg-amber-100 text-amber-700"  :
                                                                       "bg-red-100   text-red-700"
                }`}>
                  {providerProfile.availabilityStatus}
                </span>
              } />

              {providerProfile.skills.length > 0 && (
                <div className="pt-3">
                  <p className="text-xs text-slate-400 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {providerProfile.skills.map((s) => (
                      <span key={s} className="badge bg-blue-50 text-blue-700 text-[11px]">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {user.role === "provider" && !providerProfile && (
          <Section title="Provider Profile">
            <p className="text-xs text-slate-400 italic">No provider profile created yet.</p>
          </Section>
        )}
      </div>

      {/* ── Modals / Drawers ──────────────────────────────────────────────── */}
      {showEditRole && (
        <EditRoleModal
          userId={userId}
          currentRole={user.role as "client" | "provider" | "admin" | "staff"}
          currentCapabilities={(user as { capabilities?: string[] }).capabilities ?? []}
          onClose={() => setShowEditRole(false)}
          onSuccess={() => setShowEditRole(false)}
        />
      )}

      {showActivity && (
        <ActivityDrawer
          userId={userId}
          userName={user.name}
          onClose={() => setShowActivity(false)}
        />
      )}
    </div>
  );
}
