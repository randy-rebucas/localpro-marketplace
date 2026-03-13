"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface InviteInfo {
  agencyName: string;
  invitedEmail: string;
  role: string;
  expiresAt: string;
}

type PageState = "loading" | "ready" | "accepting" | "accepted" | "error";

const ROLE_LABELS: Record<string, string> = {
  worker: "Worker / Technician",
  dispatcher: "Dispatcher",
  supervisor: "Supervisor",
  finance: "Finance",
};

export default function AgencyInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [state, setState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedMsg, setAcceptedMsg] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/agency/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Invalid invite link.");
        setInvite(data.invite);
        setHasAccount(data.hasAccount);
        setState("ready");
      })
      .catch((err) => {
        setError(err.message);
        setState("error");
      });
  }, [token]);

  async function handleAccept() {
    setState("accepting");
    try {
      const res = await fetch(`/api/agency/invite/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept invite.");
      setAcceptedMsg(data.message);
      setState("accepted");
      // Refresh session after 2 seconds
      setTimeout(() => router.push("/provider/dashboard"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 text-sm animate-pulse">Loading invite details…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">✕</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Invite Unavailable</h1>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <Link href="/" className="text-blue-600 text-sm hover:underline">
            Return to LocalPro
          </Link>
        </div>
      </div>
    );
  }

  if (state === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Welcome to the team!</h1>
          <p className="text-slate-500 text-sm">{acceptedMsg}</p>
          <p className="text-slate-400 text-xs mt-3">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const expiresDate = new Date(invite.expiresAt).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🏢</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">You&apos;re Invited!</h1>
          <p className="text-slate-500 text-sm mt-1">
            Join <strong className="text-slate-700">{invite.agencyName}</strong> on LocalPro
          </p>
        </div>

        {/* Details */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-2 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Agency</span>
            <span className="font-medium text-slate-800">{invite.agencyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Role</span>
            <span className="font-medium text-slate-800">
              {ROLE_LABELS[invite.role] ?? invite.role}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Invited email</span>
            <span className="font-medium text-slate-800">{invite.invitedEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Expires</span>
            <span className="font-medium text-slate-800">{expiresDate}</span>
          </div>
        </div>

        {/* CTA */}
        {hasAccount ? (
          <button
            onClick={handleAccept}
            disabled={state === "accepting"}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
          >
            {state === "accepting" ? "Joining…" : "Accept Invitation"}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 text-center">
              You need a LocalPro <strong>provider account</strong> to accept this invite.
            </p>
            <Link
              href={`/register?email=${encodeURIComponent(invite.invitedEmail)}&redirect=/agency/invite/${token}`}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 text-sm text-center transition-colors"
            >
              Create an Account
            </Link>
            <Link
              href={`/login?redirect=/agency/invite/${token}`}
              className="block w-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg py-3 text-sm text-center transition-colors"
            >
              Already have an account? Log in
            </Link>
          </div>
        )}

        <p className="text-center text-slate-400 text-xs mt-5">
          If you weren&apos;t expecting this, you can safely ignore this page.
        </p>
      </div>
    </div>
  );
}
