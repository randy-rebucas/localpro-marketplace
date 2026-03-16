"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import { X, Shield } from "lucide-react";

const ALL_CAPABILITIES = [
  { key: "manage_jobs",       label: "Manage Jobs"       },
  { key: "manage_kyc",        label: "Manage KYC"        },
  { key: "manage_disputes",   label: "Manage Disputes"   },
  { key: "manage_users",      label: "Manage Users"      },
  { key: "manage_agencies",   label: "Manage Agencies"   },
  { key: "manage_businesses", label: "Manage Businesses" },
  { key: "view_revenue",      label: "View Revenue"      },
  { key: "manage_payouts",    label: "Manage Payouts"    },
  { key: "manage_categories", label: "Manage Categories" },
  { key: "manage_support",    label: "Manage Support"    },
  { key: "manage_courses",    label: "Manage Courses"    },
] as const;

type Role = "client" | "provider" | "admin" | "staff";

interface Props {
  userId: string;
  currentRole: Role;
  currentCapabilities: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRoleModal({
  userId,
  currentRole,
  currentCapabilities,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(currentRole);
  const [caps, setCaps] = useState<Set<string>>(new Set(currentCapabilities));
  const [loading, setLoading] = useState(false);

  function toggleCap(key: string) {
    setCaps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setLoading(true);
    try {
      const body: Record<string, unknown> = { role };
      if (role === "staff") body.capabilities = [...caps];
      else body.capabilities = []; // clear caps for non-staff

      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update role"); return; }
      toast.success("Role updated successfully.");
      router.refresh();
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-slate-900">Edit Role & Capabilities</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Role selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Role</label>
          <div className="grid grid-cols-2 gap-2">
            {(["client", "provider", "admin", "staff"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                  role === r
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Capabilities — only shown for staff */}
        {role === "staff" && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Capabilities
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {ALL_CAPABILITIES.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={caps.has(key)}
                    onChange={() => toggleCap(key)}
                    className="rounded border-slate-300 text-primary focus:ring-primary/30"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        {(role === "admin") && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Granting <strong>admin</strong> access gives full platform control. Proceed with caution.
          </p>
        )}

        {/* Footer */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
