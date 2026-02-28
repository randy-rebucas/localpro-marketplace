"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { IProviderProfile, AvailabilityStatus, WeeklySchedule } from "@/types";
import { DEFAULT_SCHEDULE } from "@/types";
import Card, { CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import SkillsInput from "@/components/shared/SkillsInput";
import KycUpload from "@/components/shared/KycUpload";
import { Star, Camera } from "lucide-react";
import { Skeleton } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/fetchClient";

// Lazy-load ScheduleEditor — it’s large and only needed below the fold
const ScheduleEditor = dynamic(
  () => import("@/components/shared/ScheduleEditor"),
  { loading: () => <Skeleton className="h-64 rounded-xl" />, ssr: false }
);

type ProfileData = Partial<
  Pick<
    IProviderProfile,
    | "bio"
    | "skills"
    | "yearsExperience"
    | "hourlyRate"
    | "availabilityStatus"
    | "schedule"
    | "avgRating"
    | "completedJobCount"
  >
>;

const AVAILABILITY_CONFIG: Record<
  AvailabilityStatus,
  { label: string; dot: string; active: string }
> = {
  available: {
    label: "Available",
    dot: "bg-green-500",
    active: "border-green-500 bg-green-50 text-green-700",
  },
  busy: {
    label: "Busy",
    dot: "bg-yellow-500",
    active: "border-yellow-500 bg-yellow-50 text-yellow-700",
  },
  unavailable: {
    label: "Unavailable",
    dot: "bg-slate-400",
    active: "border-slate-400 bg-slate-100 text-slate-600",
  },
};

function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= Math.round(value)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

export default function ProviderProfilePage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Avatar — seeded directly from store (DashboardShell resolves fetchMe before rendering)
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState(0);
  const [hourlyRate, setHourlyRate] = useState("");
  const [availability, setAvailability] = useState<AvailabilityStatus>("available");
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_SCHEDULE);

  useEffect(() => {
    apiFetch("/api/providers/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data ?? {});
        setBio(data?.bio ?? "");
        setSkills(data?.skills ?? []);
        setYearsExperience(data?.yearsExperience ?? 0);
        setHourlyRate(data?.hourlyRate?.toString() ?? "");
        setAvailability(data?.availabilityStatus ?? "available");
        setSchedule(data?.schedule ?? DEFAULT_SCHEDULE);
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-selecting same file re-triggers
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG and WEBP images are allowed");
      return;
    }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB"); return; }

    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "avatars");
      const uploadRes = await apiFetch("/api/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { toast.error(uploadData.error ?? "Upload failed"); return; }

      const saveRes = await apiFetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: uploadData.url }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) { toast.error(saveData.error ?? "Failed to save avatar"); return; }

      setAvatar(saveData.avatar);
      if (user) setUser({ ...user, avatar: saveData.avatar });
      toast.success("Profile picture updated!");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/providers/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          skills,
          yearsExperience: Number(yearsExperience),
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          availabilityStatus: availability,
          schedule,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save profile");
        return;
      }

      const updated = await res.json();
      setProfile(updated);
      toast.success("Profile saved!");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveProfile();
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6 animate-pulse">
        <div>
          <div className="h-7 w-32 bg-slate-200 rounded-md" />
          <div className="h-4 w-64 bg-slate-100 rounded mt-2" />
        </div>
        {/* Header card skeleton */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-48 bg-slate-100 rounded" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
          </div>
          <div className="hidden sm:flex gap-6">
            <div className="h-12 w-14 bg-slate-100 rounded" />
            <div className="h-12 w-14 bg-slate-100 rounded" />
          </div>
        </div>
        {/* Profile details card skeleton */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-24 w-full bg-slate-100 rounded-lg" />
          <div className="h-9 w-full bg-slate-100 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-9 bg-slate-100 rounded-lg" />
            <div className="h-9 bg-slate-100 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-slate-100 rounded-lg" />
            <div className="flex-1 h-10 bg-slate-100 rounded-lg" />
            <div className="flex-1 h-10 bg-slate-100 rounded-lg" />
          </div>
        </div>
        {/* Schedule card skeleton */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="h-4 w-32 bg-slate-200 rounded" />
          <div className="h-64 w-full bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const cfg = AVAILABILITY_CONFIG[availability];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Clients see this information when you submit a quote.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* Profile header card */}
      <Card>
        <CardBody className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
              className="relative h-16 w-16 rounded-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              disabled={uploadingAvatar}
              title="Change profile picture"
            >
              {avatar ? (
                <Image
                  src={avatar}
                  alt={user?.name || "Profile picture"}
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
            <span
              className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${cfg.dot} pointer-events-none`}
            />
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{user?.name ?? "—"}</p>
            <p className="text-sm text-slate-500 truncate">{user?.email ?? ""}</p>
            <span
              className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.active}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center divide-x divide-slate-100">
            <div className="pr-5 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {profile.completedJobCount ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Jobs done</p>
            </div>
            <div className="pl-5 text-center">
              {profile.avgRating && profile.avgRating > 0 ? (
                <>
                  <p className="text-2xl font-bold text-slate-900">
                    {profile.avgRating.toFixed(1)}
                  </p>
                  <StarRating value={profile.avgRating} />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-300">—</p>
                  <p className="text-xs text-slate-400 mt-0.5">No ratings</p>
                </>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Edit form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-700">Profile details</h3>
          </CardHeader>
          <CardBody className="space-y-5">
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Tell clients about your experience, specialties, and working style…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{bio.length}/1000</p>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Skills
              </label>
              <SkillsInput
                value={skills}
                onChange={setSkills}
              />
            </div>

            {/* Years of experience + hourly rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Years of experience
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Hourly rate (₱){" "}
                  <span className="text-slate-400 font-normal">optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="500"
                    className="w-full rounded-lg border border-slate-200 pl-7 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Availability
              </label>
              <div className="flex gap-2">
                {(["available", "busy", "unavailable"] as AvailabilityStatus[]).map(
                  (status) => {
                    const c = AVAILABILITY_CONFIG[status];
                    const isActive = availability === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setAvailability(status)}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? c.active
                            : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${isActive ? c.dot : "bg-slate-300"}`}
                        />
                        {c.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </CardBody>
          <CardFooter className="flex justify-end">
            <Button type="submit" isLoading={saving} size="md">
              Save profile
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Weekly schedule</h3>
            <p className="text-xs text-slate-400 mt-0.5">Set the days and hours you’re available to take jobs.</p>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <ScheduleEditor value={schedule} onChange={setSchedule} />
        </CardBody>
        <CardFooter className="flex justify-end">
          <Button type="button" isLoading={saving} size="md" onClick={saveProfile}>
            Save schedule
          </Button>
        </CardFooter>
      </Card>

      {/* KYC Verification */}
      <KycUpload />
    </div>
  );
}

