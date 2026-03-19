"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { IAddress, IServiceArea, IProviderProfile, AvailabilityStatus, WeeklySchedule } from "@/types";
import { DEFAULT_SCHEDULE } from "@/types";
import Card, { CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import PhoneInput, { isValidPhoneNumber } from "@/components/shared/PhoneInput";
import KycUpload from "@/components/shared/KycUpload";
import { Star, Camera, BadgeCheck, AlertCircle, MapPin, Trash2, Plus, LocateFixed, Loader2, Sparkles, Lock, Share2, Check, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/fetchClient";
import { getProviderTier } from "@/lib/tier";

// Lazy-load ScheduleEditor — it's large and only needed below the fold
const ScheduleEditor = dynamic(
  () => import("@/components/shared/ScheduleEditor"),
  { loading: () => <Skeleton className="h-64 rounded-xl" />, ssr: false }
);
// Lazy-load StructuredAddressInput (depends on Google Maps / Nominatim)
const StructuredAddressInput = dynamic(
  () => import("@/components/shared/StructuredAddressInput"),
  { ssr: false }
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
    | "completionRate"
    | "serviceAreas"
  >
>;

interface Skill {
  skill: string;
  yearsExperience: number;
  hourlyRate: string;
}

interface Props {
  initialProfile: ProfileData;
}

// Common skills for autocomplete while typing
const COMMON_SKILLS = [
  "Web Design", "Web Development", "Mobile App Development", "UI/UX Design",
  "Graphic Design", "Logo Design", "Branding", "Copywriting",
  "Content Writing", "Technical Writing", "SEO Optimization", "Social Media Management",
  "Digital Marketing", "Email Marketing", "Video Editing", "Photography",
  "Photo Editing", "Illustration", "Animation", "3D Modeling",
  "Frontend Development", "Backend Development", "Full Stack Development", "Database Design",
  "DevOps", "System Administration", "Cloud Computing", "AWS",
  "Project Management", "Business Consulting", "Financial Planning", "Accounting",
  "Tax Preparation", "Legal Consulting", "Virtual Assistant", "Data Entry",
  "Data Analysis", "Machine Learning", "Artificial Intelligence", "Python",
  "JavaScript", "TypeScript", "React", "Node.js", "Vue.js", "Angular",
  "Java", "C++", "PHP", "SQL", "MongoDB", "Firebase",
  "WordPress Development", "Shopify Development", "E-commerce Setup", "SEO",
  "Google Ads", "Facebook Ads", "Paid Advertising", "Influencer Marketing",
  "Brand Strategy", "Market Research", "Translation", "Localization",
  "Customer Support", "Sales", "Lead Generation", "Recruitment",
  "Training Delivery", "Curriculum Development", "Online Teaching", "Tutoring",
  "Music Production", "Sound Design", "Voice Over", "Podcast Editing",
  "Video Production", "Streaming Setup", "Fitness Coaching", "Nutrition Planning",
  "Interior Design", "Architecture", "CAD Design", "AutoCAD",
  "Electrical Work", "Plumbing", "HVAC", "Carpentry",
  "Landscaping", "Cleaning Services", "Handyman Services", "Home Maintenance"
];

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

export default function ProfileClient({ initialProfile }: Props) {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleShareProfile() {
    const url = `${window.location.origin}/providers/${user?._id}`;
    if (navigator.share) {
      try { await navigator.share({ title: "My LocalPro profile", url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [suggestingSkills, setSuggestingSkills] = useState(false);
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);

  // Avatar — seeded directly from store (DashboardShell resolves fetchMe before rendering)
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Phone — stored on User, saved via /api/auth/me
  const [phone, setPhone] = useState(user?.phone ?? "");

  // Saved addresses
  const [addresses, setAddresses] = useState<IAddress[]>(user?.addresses ?? []);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newLabel, setNewLabel] = useState("Home");
  const [newAddressText, setNewAddressText] = useState("");
  const [newAddressCoords, setNewAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Service areas
  const [serviceAreas, setServiceAreas] = useState<IServiceArea[]>(initialProfile.serviceAreas ?? []);
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaLabel, setNewAreaLabel] = useState("");
  const [newAreaText, setNewAreaText] = useState("");
  const [newAreaCoords, setNewAreaCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingArea, setSavingArea] = useState(false);
  const [detectingArea, setDetectingArea] = useState(false);

  // Form state — initialised from server-fetched profile
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  
  // Helper function to safely convert skills from any format to Skill[]
  const initializeSkills = (): Skill[] => {
    if (!Array.isArray(initialProfile.skills)) return [];
    
    return initialProfile.skills
      .map((skill: unknown) => {
        // Already in correct Skill object format
        if (typeof skill === "object" && skill !== null && "skill" in skill) {
          return {
            skill: String((skill as Record<string, unknown>).skill || ""),
            yearsExperience: Number((skill as Record<string, unknown>).yearsExperience ?? 0),
            hourlyRate: String((skill as Record<string, unknown>).hourlyRate ?? ""),
          };
        }
        // Old format: string - convert to Skill object
        if (typeof skill === "string") {
          return {
            skill: skill.trim(),
            yearsExperience: 0,
            hourlyRate: "",
          };
        }
        return null;
      })
      .filter((s): s is Skill => s !== null);
  };
  
  const [skills, setSkills] = useState<Skill[]>(initializeSkills());
  const [newSkillInput, setNewSkillInput] = useState("");
  const [yearsExperience, setYearsExperience] = useState(initialProfile.yearsExperience ?? 0);
  const [hourlyRate, setHourlyRate] = useState(initialProfile.hourlyRate?.toString() ?? "");
  const [availability, setAvailability] = useState<AvailabilityStatus>(initialProfile.availabilityStatus ?? "available");
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialProfile.schedule ?? DEFAULT_SCHEDULE);

  // ── Auto-suggest skills when bio is sufficient ────────────────────────────────
  // Compute tier here for auto-suggest check
  const autoSuggestTier = useMemo(
    () => getProviderTier(profile.completedJobCount ?? 0, profile.avgRating ?? 0, profile.completionRate ?? 0),
    [profile.completedJobCount, profile.avgRating, profile.completionRate]
  );

  useEffect(() => {
    // Only auto-suggest if user has AI access AND bio meeting minimum length
    if (!autoSuggestTier.hasAIAccess) return;

    const debounceTimer = setTimeout(() => {
      const bioTrimmed = bio.trim();
      // Auto-suggest only if: bio is adequate, no existing suggestions, not already fetching
      if (
        bioTrimmed.length >= 50 &&
        skillSuggestions.length === 0 &&
        !suggestingSkills &&
        skills.length < 10 // Don't suggest if user already has many skills
      ) {
        suggestSkills();
      }
    }, 1500); // Wait 1.5s after user stops typing before auto-suggesting

    return () => clearTimeout(debounceTimer);
  }, [bio, autoSuggestTier.hasAIAccess, skillSuggestions.length, suggestingSkills, skills.length]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    if (phone && !isValidPhoneNumber(phone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    setSaving(true);
    try {
      // Ensure skills are properly formatted as Skill objects
      const formattedSkills = skills.map((skill) => ({
        skill: String(skill.skill || "").trim(),
        yearsExperience: Number(skill.yearsExperience ?? 0),
        hourlyRate: String(skill.hourlyRate ?? "").trim(),
      }));

      const [res, phoneRes] = await Promise.all([
        apiFetch("/api/providers/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bio,
            skills: formattedSkills,
            yearsExperience: Number(yearsExperience),
            hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
            availabilityStatus: availability,
            schedule,
          }),
        }),
        apiFetch("/api/auth/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone || null }),
        }),
      ]);

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to save profile");
        return;
      }
      if (!phoneRes.ok) {
        const phErr = await phoneRes.json();
        toast.error(phErr.error ?? "Failed to save phone number");
        return;
      }

      const updated = await res.json();
      setProfile(updated);
      if (user) setUser({ ...user, phone: phone || null });
      toast.success("Profile saved!");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveProfile();
  }

  async function generateBio() {
    setGeneratingBio(true);
    try {
      const res = await apiFetch("/api/providers/profile/generate-bio", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to generate bio"); return; }
      setBio(data.bio);
      toast.success("Bio generated! Review and save when ready.");
    } finally {
      setGeneratingBio(false);
    }
  }

  async function suggestSkills() {
    // Check tier access and bio length
    if (!autoSuggestTier.hasAIAccess) {
      toast.error(`Skill suggestions require Gold tier. ${autoSuggestTier.nextMsg}`);
      return;
    }
    if (bio.trim().length < 50) {
      toast.error("Write at least 50 characters in your bio to get skill suggestions.");
      return;
    }

    setSuggestingSkills(true);
    try {
      const res = await apiFetch("/api/ai/suggest-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, existingSkills: skills.map((s) => s.skill) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to get skill suggestions"); return; }
      const existingSet = new Set(skills.map((s) => s.skill.toLowerCase()));
      const newSuggestions = (data.skills as string[]).filter(
        (s) => !existingSet.has(s.toLowerCase())
      );
      if (newSuggestions.length === 0) {
        toast("All suggested skills are already added!", { icon: "✅" });
      } else {
        setSkillSuggestions(newSuggestions);
      }
    } finally {
      setSuggestingSkills(false);
    }
  }

  function handleAddSkill(skillName: string) {
    const trimmed = skillName.trim();
    if (!trimmed || skills.some((s) => s.skill.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills([
      ...skills,
      { skill: trimmed, yearsExperience: yearsExperience || 0, hourlyRate: hourlyRate || "" },
    ]);
    setNewSkillInput("");
    setSkillSuggestions((prev) => prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()));
  }

  function handleRemoveSkill(index: number) {
    setSkills(skills.filter((_, i) => i !== index));
  }

  function handleUpdateSkill(index: number, updates: Partial<Skill>) {
    const updated = [...skills];
    updated[index] = { ...updated[index], ...updates };
    setSkills(updated);
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

  async function detectServiceAreaLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setDetectingArea(true);
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
              "sublocality_level_1", "locality", "neighborhood",
              "administrative_area_level_2", "administrative_area_level_1",
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
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=12`,
              { headers: { "Accept-Language": "en", "User-Agent": "LocalPro/1.0" } }
            );
            if (r.ok) resolved = (await r.json()).display_name ?? "";
          } catch { /* ignore */ }
        }
        setNewAreaText(resolved || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setNewAreaCoords({ lat, lng });
        toast.success("Location detected!");
      } else {
        try {
          const r = await fetch("https://ipapi.co/json/");
          if (r.ok) {
            const d = await r.json();
            resolved = [d.city, d.region, d.country_name].filter(Boolean).join(", ");
          }
        } catch { /* ignore */ }
        setNewAreaText(resolved || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setNewAreaCoords(null);
        toast("Approximate area detected — please refine if needed.", { icon: "⚠️", duration: 5000 });
      }
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 1) toast.error("Location access denied. Enable it in your browser settings.");
      else toast.error("Could not detect your location. Try typing it manually.");
    } finally {
      setDetectingArea(false);
    }
  }

  async function handleAddServiceArea() {
    const trimmed = newAreaText.trim();
    if (!trimmed) return;
    setSavingArea(true);
    try {
      const res = await apiFetch("/api/providers/profile/service-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label:       newAreaLabel.trim() || trimmed,
          address:     trimmed,
          coordinates: newAreaCoords ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add service area"); return; }
      setServiceAreas(data);
      setNewAreaText("");
      setNewAreaCoords(null);
      setNewAreaLabel("");
      setAddingArea(false);
      toast.success("Service area saved!");
    } finally {
      setSavingArea(false);
    }
  }

  async function handleDeleteServiceArea(id: string) {
    const res = await apiFetch(`/api/providers/profile/service-areas/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "Failed to remove service area"); return; }
    setServiceAreas(data);
    toast.success("Service area removed");
  }

  // ── Memoised derived values ────────────────────────────────────────────────
  const tier = useMemo(
    () => autoSuggestTier,
    [autoSuggestTier]
  );

  const completeness = useMemo(() => {
    const items = [
      !!avatar,
      user?.kycStatus === "approved",
      isValidPhoneNumber(phone ?? ""),
      bio.trim().length >= 50,
      skills.length > 0,
      yearsExperience > 0,
      !!hourlyRate,
      addresses.length > 0,
      serviceAreas.length > 0,
      Object.values(schedule).some((d) => d.enabled),
    ];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  }, [avatar, user?.kycStatus, phone, bio, skills, yearsExperience, hourlyRate, addresses, serviceAreas, schedule]);

  const initials = user?.name
    ? user.name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const cfg = AVAILABILITY_CONFIG[availability];
  const completenessColor = completeness === 100 ? "bg-green-500" : completeness >= 60 ? "bg-primary" : "bg-amber-400";

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">My Profile</h2>
          <p className="hidden sm:block text-sm text-slate-500 mt-1">
            Clients see this when you submit a quote.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/providers/${user?._id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              title="Open your public profile in a new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View public profile
            </Link>
            <button
              type="button"
              onClick={handleShareProfile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              title="Share your public profile link"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Share2 className="h-3.5 w-3.5" />}
              {copiedLink ? "Copied!" : "Share"}
            </button>
          </div>
          <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            {completeness === 100
              ? <BadgeCheck className="h-4 w-4 text-green-500" />
              : <AlertCircle className="h-4 w-4 text-amber-400" />}
            <span className="text-xs font-medium text-slate-600">{completeness}% complete</span>
          </div>
          <div className="w-24 sm:w-32 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${completenessColor}`} style={{ width: `${completeness}%` }} />
          </div>
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
          {/* Profile card */}
          <Card>
            <CardBody className="flex flex-col items-center text-center gap-4 pt-6 pb-5">
              {/* Avatar */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                  className="relative h-24 w-24 rounded-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  disabled={uploadingAvatar}
                  title="Change profile picture"
                >
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={user?.name || "Profile picture"}
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
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </span>
                </button>
                <span className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${cfg.dot} pointer-events-none`} />
              </div>

              {/* Name + status */}
              <div className="w-full">
                <p className="font-semibold text-slate-900 text-base truncate">{user?.name ?? "—"}</p>
                <p className="text-sm text-slate-400 truncate">{user?.email ?? ""}</p>
                <div className="mt-2 flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.active}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="w-full grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-4">
                <div className="text-center px-2">
                  <p className="text-2xl font-bold text-slate-900 leading-none">{profile.completedJobCount ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Jobs done</p>
                </div>
                <div className="text-center px-2">
                  {profile.avgRating && profile.avgRating > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-slate-900 leading-none">{profile.avgRating.toFixed(1)}</p>
                      <div className="mt-1 flex justify-center"><StarRating value={profile.avgRating} /></div>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-slate-300 leading-none">—</p>
                      <p className="text-xs text-slate-400 mt-1">No ratings yet</p>
                    </>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* KYC */}
          <KycUpload />
        </div>

        {/* ── Right column ───────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Edit form */}
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Profile details</h3>
                  <p className="text-xs text-slate-400 mt-0.5">A complete profile gets significantly more quotes accepted.</p>
                </div>
              </CardHeader>
              <CardBody className="space-y-5">
                {/* Phone number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone number</label>
                  <PhoneInput value={phone} onChange={setPhone} className="w-full" />
                  <p className="text-xs text-slate-400 mt-1">Clients can reach you directly when a job is assigned.</p>
                </div>

                {/* Bio */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">Bio</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={generateBio}
                        disabled={generatingBio}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                        title={!tier.hasAIAccess ? `Requires Gold tier – ${tier.nextMsg}` : "Generate bio with AI based on your skills, experience and service areas"}
                      >
                        {generatingBio
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : tier.hasAIAccess
                            ? <Sparkles className="h-3 w-3" />
                            : <Lock className="h-3 w-3" />}
                        {generatingBio
                          ? "Generating…"
                          : tier.hasAIAccess
                            ? "Generate with AI"
                            : "Generate with AI · 🥇 Gold"}
                      </button>
                      <span className={`text-xs tabular-nums ${
                        bio.length >= 900 ? "text-red-400" : bio.length >= 50 ? "text-green-500" : "text-slate-400"
                      }`}>{bio.length}/1000</span>
                    </div>
                  </div>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Tell clients about your experience, specialties, and working style…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  />
                  {bio.trim().length < 50 && bio.length > 0 && (
                    <p className="text-xs text-amber-500 mt-1">Add at least 50 characters for a stronger profile.</p>
                  )}
                </div>

                {/* Skills with details */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">Skills</label>
                    <div className="flex items-center gap-3">
                      {skills.length > 0 && (
                        <span className="text-xs text-slate-400">{skills.length} skill{skills.length !== 1 ? "s" : ""} added</span>
                      )}
                      <button
                        type="button"
                        onClick={suggestSkills}
                        disabled={suggestingSkills}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                        title={!tier.hasAIAccess ? `Requires Gold tier – ${tier.nextMsg}` : "Suggest skills using AI based on your bio"}
                      >
                        {suggestingSkills
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : tier.hasAIAccess
                            ? <Sparkles className="h-3 w-3" />
                            : <Lock className="h-3 w-3" />}
                        {suggestingSkills
                          ? "Suggesting…"
                          : tier.hasAIAccess
                            ? "Suggest with AI"
                            : "Suggest with AI · 🥇 Gold"}
                      </button>
                    </div>
                  </div>

                  {/* Added skills list */}
                  <div className="space-y-2 mb-3">
                    {skills.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Skill</label>
                          <input
                            type="text"
                            value={skill.skill}
                            onChange={(e) => handleUpdateSkill(index, { skill: e.target.value })}
                            placeholder="e.g., Web Design"
                            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Experience (years)</label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={skill.yearsExperience}
                            onChange={(e) => handleUpdateSkill(index, { yearsExperience: Number(e.target.value) })}
                            placeholder="0"
                            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-xs font-medium text-slate-600 mb-1">Rate (₱) [hourly]</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₱</span>
                            <input
                              type="number"
                              min={0}
                              value={skill.hourlyRate}
                              onChange={(e) => handleUpdateSkill(index, { hourlyRate: e.target.value })}
                              placeholder="0"
                              className="w-full rounded-md border border-slate-200 pl-6 pr-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(index)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded flex-shrink-0"
                          title="Remove skill"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new skill with autocomplete */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkillInput}
                        onChange={(e) => setNewSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkill(newSkillInput);
                          }
                        }}
                        placeholder="Add a new skill..."
                        maxLength={100}
                        autoComplete="off"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSkill(newSkillInput)}
                        disabled={!newSkillInput.trim()}
                        className="px-4 py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add skill
                      </button>
                    </div>

                    {/* Autocomplete dropdown - shows on typing with common skills + AI suggestions */}
                    {newSkillInput.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg border border-slate-200 bg-white shadow-md">
                        <ul className="max-h-48 overflow-y-auto">
                          {(() => {
                            const input = newSkillInput.toLowerCase();
                            const addedSkills = new Set(skills.map((s) => s.skill.toLowerCase()));
                            
                            // Combine common skills + AI suggestions
                            const allSuggestions = Array.from(
                              new Set([...COMMON_SKILLS, ...skillSuggestions])
                            );
                            
                            // Filter matches
                            const matches = allSuggestions
                              .filter(
                                (s) =>
                                  s.toLowerCase().includes(input) &&
                                  !addedSkills.has(s.toLowerCase())
                              )
                              .sort((a, b) => {
                                // Prioritize exact prefix matches
                                const aStartsWith = a.toLowerCase().startsWith(input);
                                const bStartsWith = b.toLowerCase().startsWith(input);
                                if (aStartsWith && !bStartsWith) return -1;
                                if (!aStartsWith && bStartsWith) return 1;
                                return a.localeCompare(b);
                              })
                              .slice(0, 8);
                            
                            return matches.map((suggestion) => (
                              <li key={suggestion}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddSkill(suggestion);
                                    setNewSkillInput("");
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-slate-900 hover:bg-primary/10 transition-colors border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                                >
                                  <span>{suggestion}</span>
                                  <Plus className="h-3.5 w-3.5 text-primary opacity-50" />
                                </button>
                              </li>
                            ));
                          })()}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* All AI suggestions (non-inline) */}
                  {skillSuggestions.length > 0 && newSkillInput.trim().length === 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium text-slate-600">Suggested skills:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {skillSuggestions.filter((s) => !skills.some((sk) => sk.skill.toLowerCase() === s.toLowerCase())).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleAddSkill(suggestion)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {skills.length === 0 && skillSuggestions.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1.5">Add skills with their experience level and rate so clients can find you.</p>
                  )}
                </div>

                {/* Years of experience */}
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
                  <p className="text-xs text-slate-400 mt-1">Overall professional experience. Skill-specific rates are set individually above.</p>
                </div>

                {/* Availability */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">Availability status</label>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.active}`}>{cfg.label}</span>
                  </div>
                  <div className="flex gap-2">
                    {(["available", "busy", "unavailable"] as AvailabilityStatus[]).map((status) => {
                      const c = AVAILABILITY_CONFIG[status];
                      const isActive = availability === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setAvailability(status)}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                            isActive
                              ? `${c.active} shadow-sm`
                              : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${isActive ? c.dot : "bg-slate-300"}`} />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Controls whether new clients can see you as available for hire.</p>
                </div>
              </CardBody>
              <CardFooter className="flex justify-end">
                <Button type="submit" isLoading={saving} size="md">
                  Save profile
                </Button>
              </CardFooter>
            </Card>
          </form>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Saved addresses</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Quick-fill your location when posting or quoting jobs.</p>
                </div>
                <span className="text-xs text-slate-400">{addresses.length}/10</span>
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
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2">
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

          {/* Service areas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Service areas</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Areas where you&apos;re available to take on jobs.</p>
                </div>
                <span className="text-xs text-slate-400">{serviceAreas.length}/10</span>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {serviceAreas.length === 0 && !addingArea && (
                <p className="text-sm text-slate-400 text-center py-4">
                  No service areas yet. Add the locations you cover.
                </p>
              )}
              {serviceAreas.map((area) => (
                <div
                  key={String(area._id)}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-700">{area.label}</span>
                    {area.label !== area.address && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{area.address}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteServiceArea(area._id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded flex-shrink-0"
                    title="Remove service area"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {addingArea ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
                      <input
                        value={newAreaLabel}
                        onChange={(e) => setNewAreaLabel(e.target.value)}
                        placeholder="e.g. Makati CBD"
                        maxLength={80}
                        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-slate-600">Area / city</label>
                        <button
                          type="button"
                          onClick={detectServiceAreaLocation}
                          disabled={detectingArea}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                          title="Detect my current location"
                        >
                          {detectingArea
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <LocateFixed className="h-3 w-3" />}
                          {detectingArea ? "Detecting…" : "Use my location"}
                        </button>
                      </div>
                      <StructuredAddressInput
                        confirmedAddress={newAreaText}
                        onSelect={(val, coords) => {
                          setNewAreaText(val);
                          setNewAreaCoords(coords ?? null);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setAddingArea(false); setNewAreaText(""); setNewAreaCoords(null); setNewAreaLabel(""); }}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
                    >
                      Cancel
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      isLoading={savingArea}
                      onClick={handleAddServiceArea}
                      disabled={!newAreaText.trim()}
                    >
                      Save area
                    </Button>
                  </div>
                </div>
              ) : serviceAreas.length < 10 ? (
                <button
                  type="button"
                  onClick={() => setAddingArea(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm text-slate-500 hover:text-primary hover:border-primary/50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add service area
                </button>
              ) : null}
            </CardBody>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Weekly schedule</h3>
                <p className="text-xs text-slate-400 mt-0.5">Set the days and hours you&apos;re available to take jobs.</p>
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

        </div>{/* end right column */}
      </div>{/* end 2-column grid */}
    </div>
  );
}
