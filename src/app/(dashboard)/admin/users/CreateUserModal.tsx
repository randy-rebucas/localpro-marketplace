"use client";

import { useState } from "react";
import { X, Eye, EyeOff, Loader2, UserPlus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/fetchClient";
import Button from "@/components/ui/Button";

type Role = "client" | "provider" | "admin" | "staff" | "peso";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // Strip country code and leading 0 unconditionally
  let local = digits;
  if (local.startsWith("63")) local = local.slice(2);
  if (local.startsWith("0"))  local = local.slice(1);

  const d = local.slice(0, 10);
  if (!d)        return "+63";
  if (d.length <= 3) return `+63 ${d}`;
  if (d.length <= 6) return `+63 ${d.slice(0, 3)} ${d.slice(3)}`;
  return `+63 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function generatePassword(len = 14): string {
  const upper  = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower  = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  const rand = (set: string) => set[Math.floor(Math.random() * set.length)];
  // Guarantee one of each class, fill the rest randomly
  const chars = [rand(upper), rand(lower), rand(digits), rand(special)];
  for (let i = chars.length; i < len; i++) chars.push(rand(all));
  return chars.sort(() => Math.random() - 0.5).join("");
}

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "client",   label: "Client",      description: "Posts jobs and hires providers" },
  { value: "provider", label: "Provider",    description: "Starts in pending approval state" },
  { value: "admin",    label: "Admin",       description: "Full platform access" },
  { value: "staff",    label: "Staff",       description: "Limited admin with capabilities" },
  { value: "peso",     label: "PESO Officer", description: "Government LGU employment partner" },
];

export default function CreateUserModal({ onClose, onSuccess }: Props) {
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [role,       setRole]       = useState<Role>("client");
  const [isVerified, setIsVerified] = useState(false);
  const [saving,     setSaving]     = useState(false);
  // Provider-only fields
  const [phone,           setPhone]           = useState("");
  const [skillsRaw,       setSkillsRaw]       = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  // PESO-only fields
  const [officeName,    setOfficeName]    = useState("");
  const [municipality,  setMunicipality]  = useState("");
  const [region,        setRegion]        = useState("");
  const [officeEmail,   setOfficeEmail]   = useState("");

  // Password strength indicator (reused from client profile)
  const pwStrength = (() => {
    if (!password) return null;
    let s = 0;
    if (password.length >= 8)  s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    if (s <= 1) return { label: "Weak",   color: "bg-red-400",    width: "w-1/4" };
    if (s <= 2) return { label: "Fair",   color: "bg-amber-400",  width: "w-2/4" };
    if (s <= 3) return { label: "Good",   color: "bg-yellow-400", width: "w-3/4" };
    return          { label: "Strong", color: "bg-emerald-500", width: "w-full"  };
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !password) return;

    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          isVerified,
          ...(role === "provider" && phone.trim()           ? { phone: phone.trim() }                                                      : {}),
          ...(role === "provider" && skillsRaw.trim()       ? { skills: skillsRaw.split(",").map((s) => s.trim()).filter(Boolean) }         : {}),
          ...(role === "provider" && yearsExperience !== "" ? { yearsExperience: Math.max(0, parseInt(yearsExperience, 10) || 0) }          : {}),
          ...(role === "peso" ? {
            pesoOffice: {
              officeName:   officeName.trim(),
              municipality: municipality.trim(),
              region:       region.trim(),
              contactEmail: officeEmail.trim(),
            },
          } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create user");
        return;
      }
      toast.success(`User "${data.name}" created`);
      onSuccess();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-4 w-4 text-primary" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Create User</h2>
              <p className="text-xs text-slate-400">Manually add a user to the platform</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              placeholder="Maria Santos"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email address
              <span className="ml-1 text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@example.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwStrength && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${pwStrength.color} ${pwStrength.width} transition-all`} />
                </div>
                <span className={`text-[11px] font-medium ${
                  pwStrength.label === "Weak"   ? "text-red-500"    :
                  pwStrength.label === "Fair"   ? "text-amber-500"  :
                  pwStrength.label === "Good"   ? "text-yellow-600" : "text-emerald-600"
                }`}>{pwStrength.label}</span>
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`text-left rounded-lg border px-3 py-2 transition-all ${
                    role === opt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className={`text-xs font-semibold ${role === opt.value ? "text-primary" : "text-slate-700"}`}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Mark verified */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-primary accent-primary"
            />
            <span className="text-xs text-slate-600">Mark email as verified</span>
          </label>

          {/* Provider-only fields */}
          {role === "provider" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 space-y-3">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Provider profile (optional)</p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="+63 912 345 6789"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Skills <span className="font-normal text-slate-400">(comma-separated)</span></label>
                <input
                  type="text"
                  value={skillsRaw}
                  onChange={(e) => setSkillsRaw(e.target.value)}
                  placeholder="e.g. Plumbing, Electrical, Painting"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {skillsRaw.trim() && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {skillsRaw.split(",").map((s) => s.trim()).filter(Boolean).map((skill) => (
                      <span key={skill} className="text-[11px] bg-primary/10 text-primary rounded px-2 py-0.5 font-medium">{skill}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Years of experience</label>
                <input
                  type="number"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  min={0}
                  max={60}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* PESO-only fields */}
          {role === "peso" && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5 space-y-3">
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">PESO Office Details (required)</p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Office Name</label>
                <input
                  type="text"
                  value={officeName}
                  onChange={(e) => setOfficeName(e.target.value)}
                  required={role === "peso"}
                  placeholder="e.g. PESO City of Malolos"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Municipality / City</label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    required={role === "peso"}
                    placeholder="e.g. Malolos"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    required={role === "peso"}
                    placeholder="e.g. Region III"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Office Contact Email</label>
                <input
                  type="email"
                  value={officeEmail}
                  onChange={(e) => setOfficeEmail(e.target.value)}
                  required={role === "peso"}
                  placeholder="peso@malolos.gov.ph"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                />
              </div>

              <p className="text-[11px] text-blue-500">
                This officer will be set as the <strong>Head Officer</strong> of the new PESO office and can add their own staff.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              size="sm"
              isLoading={saving}
              disabled={
                !name.trim() ||
                password.length < 8 ||
                (role === "peso" && (!officeName.trim() || !municipality.trim() || !region.trim() || !officeEmail.trim()))
              }
            >
              {saving ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
