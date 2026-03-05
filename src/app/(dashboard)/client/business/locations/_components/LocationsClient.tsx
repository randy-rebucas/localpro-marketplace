"use client";

import { useEffect, useState } from "react";
import {
  MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Wallet, Bell,
} from "lucide-react";
import { fetchClient } from "@/lib/fetchClient";
import type { IBusinessOrganization, IBusinessLocation } from "@/types";
import { formatCurrency } from "@/lib/utils";
import LocationAutocomplete from "@/components/shared/LocationAutocomplete";
import toast from "react-hot-toast";

interface OrgApiResponse {
  org: IBusinessOrganization | null;
}

const EMPTY_FORM = { label: "", address: "", monthlyBudget: 0, alertThreshold: 80 };

export default function LocationsClient() {
  const [org, setOrg] = useState<IBusinessOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchClient<OrgApiResponse>("/api/business/org");
      setOrg(data.org);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(loc: IBusinessLocation) {
    setEditingId(loc._id.toString());
    setForm({
      label: loc.label,
      address: loc.address,
      monthlyBudget: loc.monthlyBudget,
      alertThreshold: (loc as unknown as { alertThreshold?: number }).alertThreshold ?? 80,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!org) return;
    if (!form.label.trim() || !form.address.trim()) {
      toast.error("Label and address are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const data = await fetchClient<{ org: IBusinessOrganization }>("/api/business/locations", {
          method: "PATCH",
          body: JSON.stringify({ orgId: org._id, locationId: editingId, ...form }),
        });
        setOrg(data.org);
        toast.success("Location updated.");
      } else {
        const data = await fetchClient<{ org: IBusinessOrganization }>("/api/business/locations", {
          method: "POST",
          body: JSON.stringify({ orgId: org._id, ...form }),
        });
        setOrg(data.org);
        toast.success("Location added.");
      }
      setShowForm(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save location.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(loc: IBusinessLocation) {
    if (!org) return;
    try {
      const data = await fetchClient<{ org: IBusinessOrganization }>("/api/business/locations", {
        method: "PATCH",
        body: JSON.stringify({ orgId: org._id, locationId: loc._id, isActive: !loc.isActive }),
      });
      setOrg(data.org);
    } catch {
      toast.error("Failed to update status.");
    }
  }

  async function handleDelete(locId: string) {
    if (!org) return;
    if (!confirm("Remove this location?")) return;
    try {
      const data = await fetchClient<{ org: IBusinessOrganization }>(
        `/api/business/locations?orgId=${org._id}&locationId=${locId}`,
        { method: "DELETE" }
      );
      setOrg(data.org);
      toast.success("Location removed.");
    } catch {
      toast.error("Failed to remove location.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 w-40 bg-slate-200 rounded-lg" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <MapPin className="h-10 w-10 text-slate-300" />
        <p className="text-slate-500">
          No business profile found.{" "}
          <a href="/client/business" className="text-primary underline">Create one first.</a>
        </p>
      </div>
    );
  }

  const activeCount   = org.locations.filter((l) => l.isActive).length;
  const inactiveCount = org.locations.length - activeCount;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Locations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {org.name}
            {org.locations.length > 0 && (
              <span className="ml-2 text-slate-400">
                · {activeCount} active{inactiveCount > 0 ? `, ${inactiveCount} inactive` : ""}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={showForm ? () => setShowForm(false) : openAdd}
          className="btn-primary flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add Location"}
        </button>
      </div>

      {/* ── Add / Edit form ── */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-slate-800">
              {editingId ? "Edit Location" : "New Location"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fill in the details below. Label and address are required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Label *
              </label>
              <input
                className="input w-full"
                placeholder="e.g. Main Branch"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Monthly Budget (PHP)
              </label>
              <input
                className="input w-full"
                type="number"
                min={0}
                value={form.monthlyBudget}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monthlyBudget: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Alert Threshold (%)
              </label>
              <input
                className="input w-full"
                type="number"
                min={1} max={99}
                value={form.alertThreshold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, alertThreshold: parseInt(e.target.value, 10) || 80 }))
                }
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Triggers a budget alert when spend exceeds this % of monthly budget.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Address *
              </label>
              <LocationAutocomplete
                value={form.address}
                onChange={(address) => setForm((f) => ({ ...f, address }))}
                placeholder="Start typing a full address…"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Location"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Location list ── */}
      {org.locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 gap-3">
          <MapPin className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">
            No locations yet. Click <strong className="text-slate-600">Add Location</strong> to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {org.locations.map((loc) => {
            const threshold = (loc as unknown as { alertThreshold?: number }).alertThreshold ?? 80;
            return (
              <div
                key={loc._id.toString()}
                className={`bg-white rounded-2xl border transition-opacity ${
                  loc.isActive ? "border-slate-200" : "border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl ring-4 flex-shrink-0 mt-0.5 ${
                    loc.isActive
                      ? "bg-primary/10 ring-primary/10 text-primary"
                      : "bg-slate-100 ring-slate-100 text-slate-400"
                  }`}>
                    <MapPin className="h-4 w-4" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{loc.label}</span>
                      {loc.isActive ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{loc.address}</p>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 pt-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Wallet className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700 tabular-nums">
                          {formatCurrency(loc.monthlyBudget)}
                        </span>
                        <span className="text-slate-400">/ mo</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Bell className="h-3.5 w-3.5 text-slate-400" />
                        <span>Alert at</span>
                        <span className="font-semibold text-slate-700">{threshold}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(loc)}
                      title={loc.isActive ? "Deactivate" : "Activate"}
                      className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      {loc.isActive ? (
                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(loc)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(loc._id.toString())}
                      className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


interface OrgApiResponse {
  org: IBusinessOrganization | null;
}

