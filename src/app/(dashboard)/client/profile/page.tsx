"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import Card, { CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, CalendarDays, Camera } from "lucide-react";
import { apiFetch } from "@/lib/fetchClient";

interface MeData {
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  avatar?: string | null;
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
          createdAt: String(user.createdAt),
        }
      : null
  );
  const [jobCount, setJobCount] = useState(0);

  // Edit name state
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  // Avatar upload state
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Fetch job count independently — never blocks initial render
  useEffect(() => {
    apiFetch("/api/jobs?limit=1")
      .then((r) => r.json())
      .then((data) => setJobCount(data?.total ?? data?.data?.length ?? 0))
      .catch(() => {});
  }, []);

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
    if (!name.trim() || name === me?.name) return;
    setSavingName(true);
    try {
      const res = await apiFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update name"); return; }
      setMe((prev) => prev ? { ...prev, name: data.name } : prev);
      if (user) setUser({ ...user, name: data.name });
      toast.success("Name updated!");
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

  const initials = me?.name
    ? me.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account details and password.</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* Header card */}
      <Card>
        <CardBody className="flex items-center gap-5">
          {/* Avatar */}
          <button
            type="button"
            onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
            className="relative h-16 w-16 rounded-full flex-shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            disabled={uploadingAvatar}
            title="Change profile picture"
          >
            {me?.avatar ? (
              <Image
                src={me.avatar}
                alt={me.name || "Profile picture"}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{initials}</span>
              </div>
            )}
            <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingAvatar ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </span>
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{me?.name}</p>
            <p className="text-sm text-slate-500 truncate">{me?.email}</p>
            {me?.isVerified && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-blue-600">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center divide-x divide-slate-100">
            <div className="pr-5 text-center">
              <p className="text-2xl font-bold text-slate-900">{jobCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Jobs posted</p>
            </div>
            <div className="pl-5 text-center">
              <CalendarDays className="h-5 w-5 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500 mt-0.5">
                {me?.createdAt ? `Since ${formatDate(me.createdAt)}` : "—"}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Update name */}
      <form onSubmit={saveName}>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-700">Account details</h3>
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
            <Button type="submit" isLoading={savingName} size="md" disabled={!name.trim() || name === me?.name}>
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Change password */}
      <form onSubmit={savePassword}>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-700">Change password</h3>
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
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </CardBody>
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              isLoading={savingPassword}
              size="md"
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Change password
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
