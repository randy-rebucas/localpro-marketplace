"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { IAddress } from "@/types";
import Card, { CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, CalendarDays, Camera, MapPin, Trash2, Plus, LocateFixed, Loader2, User, KeyRound, BadgeCheck, AlertCircle } from "lucide-react";
import PageGuide from "@/components/shared/PageGuide";
import KycUpload from "@/components/shared/KycUpload";
import PhoneInput, { isValidPhoneNumber } from "@/components/shared/PhoneInput";
import { apiFetch } from "@/lib/fetchClient";

// Lazy-load StructuredAddressInput (depends on Google Maps / Nominatim)
const StructuredAddressInput = dynamic(
  () => import("@/components/shared/StructuredAddressInput"),
  { ssr: false }
);

interface MeData {
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  avatar?: string | null;
  phone?: string | null;
  createdAt: string;
}

export default function ClientProfilePage() {
  const { user, setUser } = useAuthStore();

  // Seed directly from the store — DashboardShell already resolved fetchMe()
  // before rendering children, so user is always populated here.
  const [me, setMe] = useState<MeData | null>(
    user
      ? {
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          avatar: user.avatar ?? null,
          phone: user.phone ?? null,
          createdAt: String(user.createdAt),
        }
      : null
  );
  const [jobCount, setJobCount] = useState(0);

  // Edit name + phone state
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingName, setSavingName] = useState(false);

  // Avatar upload state
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Saved addresses
  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newLabel, setNewLabel] = useState("Home");
  const [newAddressText, setNewAddressText] = useState("");
  const [newAddressCoords, setNewAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Fetch job count independently — never blocks initial render
  useEffect(() => {
    apiFetch("/api/jobs?limit=1")
      .then((r) => r.json())
      .then((data) => setJobCount(data?.total ?? data?.data?.length ?? 0))
      .catch(() => {});
  }, []);

  // Seed addresses from auth store (populated by DashboardShell before render)
  useEffect(() => {
    setAddresses(user?.addresses ?? []);
  }, [user?.addresses]);

  // Sync name + phone from auth store — useState seeds are stale if user resolves after mount.
  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  useEffect(() => {
    setPhone(user?.phone ?? "");
  }, [user?.phone]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-selecting the same file re-triggers
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG and WEBP images are allowed");
      return;
    }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB"); return; }

    setUploadingAvatar(true);
    try {
      // 1. Upload to Cloudinary
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "avatars");
      const uploadRes = await apiFetch("/api/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { toast.error(uploadData.error ?? "Upload failed"); return; }

      // 2. Save URL to user profile
      const saveRes = await apiFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: uploadData.url }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) { toast.error(saveData.error ?? "Failed to save avatar"); return; }

      setMe((prev) => prev ? { ...prev, avatar: saveData.avatar } : prev);
      if (user) setUser({ ...user, avatar: saveData.avatar });
      toast.success("Profile picture updated!");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName  = name.trim();
    const trimmedPhone = phone; // E.164 — no whitespace to strip
    if (!trimmedName) return;
    if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    const nameChanged  = trimmedName  !== me?.name;
    const phoneChanged = trimmedPhone !== (me?.phone ?? "");
    if (!nameChanged && !phoneChanged) return;
    setSavingName(true);
    try {
      const res = await apiFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(nameChanged  ? { name: trimmedName }  : {}),
          ...(phoneChanged ? { phone: trimmedPhone || null } : {}), // already validated above
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update details"); return; }
      setMe((prev) => prev ? { ...prev, name: data.name, phone: data.phone } : prev);
      if (user) setUser({ ...user, name: data.name, phone: data.phone });
      toast.success("Details updated!");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSavingPassword(true);
    try {
      const res = await apiFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update password"); return; }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed!");
    } finally {
      setSavingPassword(false);
    }
  }

  async function detectCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      );
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      const isPrecise = accuracy <= 300;
      let resolved = "";

      if (isPrecise) {
        if (typeof window !== "undefined" && window.google?.maps) {
          const geocoder = new window.google.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: { lat, lng } });
          if (results && results.length > 0) {
            const PREFERRED = [
              "street_address", "premise", "subpremise",
              "route", "neighborhood", "sublocality_level_1",
              "sublocality", "locality",
            ];
            let best = results[0];
            for (const type of PREFERRED) {
              const match = results.find((r) => r.types.includes(type));
              if (match) { best = match; break; }
            }
            resolved = best.formatted_address;
          }
        }
        if (!resolved) {
          try {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=18`,
              { headers: { "Accept-Language": "en", "User-Agent": "LocalPro/1.0" } }
            );
            if (r.ok) resolved = (await r.json()).display_name ?? "";
          } catch { /* ignore */ }
        }
        setNewAddressText(resolved || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setNewAddressCoords({ lat, lng });
        toast.success("Location detected!");
      } else {
        try {
          const r = await fetch("https://ipapi.co/json/");
          if (r.ok) {
            const d = await r.json();
            const parts = [d.city, d.region, d.country_name].filter(Boolean);
            resolved = parts.join(", ");
          }
        } catch { /* ignore */ }
        setNewAddressText(resolved || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setNewAddressCoords(null);
        toast("Approximate area detected — please refine your exact address.", {
          icon: "⚠️",
          duration: 5000,
        });
      }
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 1)
        toast.error("Location access denied. Enable it in your browser settings.");
      else
        toast.error("Could not detect your location. Try typing it manually.");
    } finally {
      setDetectingLocation(false);
    }
  }

  async function handleAddAddress() {
    const trimmedAddress = newAddressText.trim();
    if (!trimmedAddress) return;
    setSavingAddress(true);
    try {
      const res = await apiFetch("/api/auth/me/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label:       newLabel.trim() || "Home",
          address:     trimmedAddress,
          coordinates: newAddressCoords ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add address"); return; }
      setAddresses(data);
      if (user) setUser({ ...user, addresses: data });
      setNewAddressText("");
      setNewAddressCoords(null);
      setNewLabel("Home");
      setAddingAddress(false);
      toast.success("Address saved!");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    if (deletingAddressId) return;
    setDeletingAddressId(id);
    try {
      const res = await apiFetch(`/api/auth/me/addresses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to remove address"); return; }
      setAddresses(data);
      if (user) setUser({ ...user, addresses: data });
      toast.success("Address removed");
    } finally {
      setDeletingAddressId(null);
    }
  }

  async function handleSetDefault(id: string) {
    if (settingDefaultId) return;
    setSettingDefaultId(id);
    try {
      const res = await apiFetch(`/api/auth/me/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update"); return; }
      setAddresses(data);
      if (user) setUser({ ...user, addresses: data });
    } finally {
      setSettingDefaultId(null);
    }
  }

  // ── Memoised derived values ────────────────────────────────────────────────
  const passwordStrength = useMemo(() => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-red-400", width: "w-1/4" };
    if (score <= 2) return { label: "Fair", color: "bg-amber-400", width: "w-2/4" };
    if (score <= 3) return { label: "Good", color: "bg-yellow-400", width: "w-3/4" };
    return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
  }, [newPassword]);

  const initials = useMemo(
    () => me?.name
      ? me.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
      : "?",
    [me?.name]
  );

  // Profile completeness (0–100): Picture · KYC approved · Phone · Address
  const { completeness, completenessColor } = useMemo(() => {
    const items = [
      !!(me?.avatar),
      user?.kycStatus === "approved",
      isValidPhoneNumber(user?.phone ?? ""),
      addresses.length > 0,
    ];
    const pct = Math.round((items.filter(Boolean).length / items.length) * 100);
    return {
      completeness: pct,
      completenessColor: pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-primary" : "bg-amber-400",
    };
  }, [me?.avatar, user?.kycStatus, user?.phone, addresses]); 

  return (
    <div className="space-y-6">
      <PageGuide
        pageKey="client-profile"
        title="How My Profile works"
        steps={[
          { icon: "👤", title: "Update your info", description: "Keep your name and profile photo up to date so providers know who they're working with." },
          { icon: "🔑", title: "Change password", description: "Update your password anytime in the Security section. You'll need your current password to confirm." },
          { icon: "🛡️", title: "Upload KYC docs", description: "Verify your identity by uploading a valid government ID. This builds trust with providers." },
          { icon: "📅", title: "Account history", description: "See your account creation date and verification status at a glance." },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your account details, password, and saved addresses.</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            {completeness === 100
              ? <BadgeCheck className="h-4 w-4 text-green-500" />
              : <AlertCircle className="h-4 w-4 text-amber-400" />}
            <span className="text-xs font-medium text-slate-600">{completeness}% complete</span>
          </div>
          <div className="w-32 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completenessColor}`}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="space-y-5">
          <Card>
            <CardBody className="flex flex-col items-center text-center gap-4 pt-6 pb-5">
              {/* Avatar */}
              <button
                type="button"
                onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                className="relative h-24 w-24 rounded-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={uploadingAvatar}
                title="Change profile picture"
              >
                {me?.avatar ? (
                  <Image
                    src={me.avatar}
                    alt={me.name || "Profile picture"}
                    width={96}
                    height={96}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">{initials}</span>
                  </div>
                )}
                <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingAvatar ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </span>
              </button>

              {/* Name + email + verified */}
              <div className="w-full space-y-0.5">
                <p className="font-semibold text-slate-900 text-base truncate">{me?.name ?? "—"}</p>
                <p className="text-sm text-slate-400 truncate">{me?.email ?? ""}</p>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold capitalize">
                    {me?.role ?? "client"}
                  </span>
                  {me?.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="w-full grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-4">
                <div className="text-center px-2">
                  <p className="text-2xl font-bold text-slate-900 leading-none">{jobCount}</p>
                  <p className="text-xs text-slate-500 mt-1">Jobs posted</p>
                </div>
                <div className="text-center px-2">
                  <CalendarDays className="h-5 w-5 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 mt-1">
                    {me?.createdAt ? `Since ${formatDate(me.createdAt)}` : "—"}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* KYC */}
          <KycUpload />
        </div>

        {/* ── Right column ───────────────────────────────────────── */}
        <div className="space-y-6">

      {/* Update name */}
      <form onSubmit={saveName}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Account details</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number</label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                className="w-full"
              />
              <p className="text-xs text-slate-400 mt-1">Used for job notifications and provider contact.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={me?.email ?? ""}
                disabled
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>
            </div>
          </CardBody>
          <CardFooter className="flex justify-end">
            <Button type="submit" isLoading={savingName} size="md" disabled={!name.trim() || (phone.length > 0 && !isValidPhoneNumber(phone)) || (name === me?.name && phone === (me?.phone ?? ""))}>  
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Change password */}
      <form onSubmit={savePassword}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Change password</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {passwordStrength && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${passwordStrength.color} ${passwordStrength.width}`} />
                  </div>
                  <p className={`text-[11px] font-medium ${
                    passwordStrength.label === "Weak" ? "text-red-500" :
                    passwordStrength.label === "Fair" ? "text-amber-500" :
                    passwordStrength.label === "Good" ? "text-yellow-600" : "text-emerald-600"
                  }`}>{passwordStrength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                  confirmPassword && confirmPassword !== newPassword
                    ? "border-red-300 bg-red-50/30"
                    : "border-slate-200"
                }`}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          </CardBody>
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              isLoading={savingPassword}
              size="md"
              disabled={!currentPassword || !newPassword || !confirmPassword || confirmPassword !== newPassword}
            >
              Change password
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Saved addresses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Saved addresses</h3>
                <p className="text-xs text-slate-400 mt-0.5">Quick-fill your location when posting jobs.</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{addresses.length}/10</span>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">

          {addresses.length === 0 && !addingAddress && (
            <p className="text-sm text-slate-400 text-center py-4">
              No saved addresses yet. Add one below.
            </p>
          )}
          {addresses.map((addr) => (
            <div
              key={String(addr._id)}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                addr.isDefault
                  ? "border-primary/40 bg-primary/5"
                  : "border-slate-200 bg-white"
              }`}
            >
              <MapPin className={`mt-0.5 h-4 w-4 flex-shrink-0 ${addr.isDefault ? "text-primary" : "text-slate-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{addr.address}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr._id)}
                    disabled={!!settingDefaultId || !!deletingAddressId}
                    className="text-[11px] font-medium text-slate-500 hover:text-primary disabled:opacity-40 transition-colors px-1.5 py-0.5 rounded"
                    title="Set as default"
                  >
                    {settingDefaultId === addr._id ? "Saving…" : "Set default"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr._id)}
                  disabled={!!deletingAddressId || !!settingDefaultId}
                  className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors rounded"
                  title="Remove address"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {addingAddress ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2.5">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Home"
                    maxLength={50}
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-600">Street &amp; postal code</label>
                    <button
                      type="button"
                      onClick={detectCurrentLocation}
                      disabled={detectingLocation}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                      title="Detect my current location"
                    >
                      {detectingLocation
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <LocateFixed className="h-3 w-3" />}
                      {detectingLocation ? "Detecting…" : "Use my location"}
                    </button>
                  </div>
                  <StructuredAddressInput
                    confirmedAddress={newAddressText}
                    onSelect={(val, coords) => {
                      setNewAddressText(val);
                      setNewAddressCoords(coords ?? null);
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setAddingAddress(false); setNewAddressText(""); setNewAddressCoords(null); setNewLabel("Home"); }}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  size="sm"
                  isLoading={savingAddress}
                  onClick={handleAddAddress}
                  disabled={!newAddressText.trim()}
                >
                  Save address
                </Button>
              </div>
            </div>
          ) : addresses.length < 10 ? (
            <button
              type="button"
              onClick={() => setAddingAddress(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm text-slate-500 hover:text-primary hover:border-primary/50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add address
            </button>
          ) : null}
        </CardBody>
      </Card>

        </div>{/* end right column */}
      </div>{/* end 2-column grid */}
    </div>
  );
}
