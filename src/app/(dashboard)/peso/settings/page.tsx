"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Settings, Building2, Save } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface OfficeSettings {
  _id: string;
  officeName: string;
  municipality: string;
  region: string;
  contactEmail: string;
  isActive: boolean;
}

export default function PesoSettingsPage() {
  const { user } = useAuthStore();
  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ officeName: "", municipality: "", region: "", contactEmail: "" });
  const [saving, setSaving] = useState(false);
  const [isHead, setIsHead] = useState(false);

  useEffect(() => {
    fetch("/api/peso/settings")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load office");
        return r.json();
      })
      .then((data) => {
        setOffice(data);
        setForm({
          officeName:   data.officeName   ?? "",
          municipality: data.municipality ?? "",
          region:       data.region       ?? "",
          contactEmail: data.contactEmail ?? "",
        });
        // Check if current user is head officer
        const headId = data.headOfficerId?._id ?? data.headOfficerId;
        setIsHead(user ? String(headId) === String(user._id) : false);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/peso/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setOffice(data);
      toast.success("Office settings updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-pulse">
        <div className="h-24 bg-white rounded-xl border border-slate-200" />
        <div className="h-64 bg-white rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (!office) return null;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          PESO Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {isHead ? "Manage your office details and configuration." : "View your office settings. Only the head officer can make changes."}
        </p>
      </div>

      {/* Office info card */}
      <div className="bg-blue-700 rounded-xl px-5 py-4 text-white flex items-start gap-3">
        <Building2 className="h-5 w-5 opacity-80 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Current Office</p>
          <p className="font-bold mt-0.5">{office.officeName}</p>
          <p className="text-sm opacity-80">{office.municipality}, {office.region}</p>
          <p className="text-xs opacity-60 mt-0.5">{office.contactEmail}</p>
        </div>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
          office.isActive ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/50"
        }`}>
          {office.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Settings form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Office Details</p>

        <div>
          <label className="text-xs font-medium text-slate-700">Office Name</label>
          <input
            required
            disabled={!isHead}
            value={form.officeName}
            onChange={(e) => setForm((f) => ({ ...f, officeName: e.target.value }))}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-700">Municipality</label>
            <input
              required
              disabled={!isHead}
              value={form.municipality}
              onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Region</label>
            <input
              required
              disabled={!isHead}
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Contact Email</label>
          <input
            required
            type="email"
            disabled={!isHead}
            value={form.contactEmail}
            onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
            className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {isHead && (
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        )}
      </form>

      {/* Platform info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Platform Configuration</p>
        <div className="space-y-2 text-sm">
          {[
            ["Verification policy", "PESO officer can assign tags"],
            ["Job approval",        "Instant (no admin review required)"],
            ["Bulk onboarding cap", "200 rows per upload"],
            ["Officer management",  "Head officer only"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-800 font-medium text-xs">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
