"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  Heart,
  Star,
  Briefcase,
  Search,
  UserX,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Sparkles,
  Timer,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { apiFetch } from "@/lib/fetchClient";

const DirectJobModal = dynamic(
  () => import("@/components/client/DirectJobModal"),
  { ssr: false }
);

interface FavoriteEntry {
  _id: string;
  provider: {
    _id: string;
    name: string;
    email: string;
    isVerified: boolean;
  };
  profile: {
    bio?: string;
    skills?: string[];
    yearsExperience?: number;
    hourlyRate?: number | null;
    avgRating?: number;
    completedJobCount?: number;
    availabilityStatus?: "available" | "busy" | "unavailable";
    avgResponseTimeHours?: number;
    completionRate?: number;
    isLocalProCertified?: boolean;
  } | null;
  createdAt: string;
}

interface ProviderResult {
  userId: { _id: string; name: string; email: string; isVerified?: boolean };
  bio?: string;
  skills?: string[];
  yearsExperience?: number;
  hourlyRate?: number | null;
  avgRating?: number;
  completedJobCount?: number;
  availabilityStatus?: "available" | "busy" | "unavailable";
  isLocalProCertified?: boolean;
  isFavorite: boolean;
}

const availabilityConfig = {
  available: { label: "Available", classes: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  busy: { label: "Busy", classes: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
  unavailable: { label: "Unavailable", classes: "bg-slate-100 text-slate-500", icon: <XCircle className="h-3 w-3" /> },
};

function ProviderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 rounded bg-slate-100" />
            <div className="h-3 w-36 rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-5 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="h-3 w-24 rounded bg-slate-100" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
      </div>
      <div className="flex gap-1.5">
        {[40, 56, 48].map((w, i) => <div key={i} className={`h-5 w-${w === 40 ? '10' : w === 56 ? '14' : '12'} rounded-full bg-slate-100`} />)}
      </div>
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <div className="h-8 flex-1 rounded-lg bg-slate-100" />
        <div className="h-8 flex-1 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
      <span className="ml-1 text-xs font-medium text-slate-600">{rating.toFixed(1)}</span>
    </span>
  );
}

/** Horizontal list-view row used in the Discover tab */
function ProviderListRow({
  id,
  name,
  email,
  isVerified,
  profile,
  onFavoriteToggle,
  onPostJob,
  isFavorite,
  isToggling,
}: {
  id: string;
  name: string;
  email: string;
  isVerified?: boolean;
  profile: FavoriteEntry["profile"] | null;
  onFavoriteToggle?: () => void;
  onPostJob: (id: string, name: string) => void;
  isFavorite?: boolean;
  isToggling?: boolean;
}) {
  const avail = profile?.availabilityStatus ?? "unavailable";
  const cfg = availabilityConfig[avail];
  const isTopRated = (profile?.avgRating ?? 0) >= 4.5 && (profile?.completedJobCount ?? 0) >= 10;
  const isFastResponder = (profile?.avgResponseTimeHours ?? 0) > 0 && (profile?.avgResponseTimeHours ?? 0) <= 2;

  const stats: string[] = [];
  if (profile?.completedJobCount !== undefined) stats.push(`${profile.completedJobCount} jobs`);
  if (profile?.yearsExperience && profile.yearsExperience > 0) stats.push(`${profile.yearsExperience}yr exp`);
  if (profile?.hourlyRate) stats.push(`${formatCurrency(profile.hourlyRate)}/hr`);

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-primary/30 hover:shadow-sm transition-all px-5 py-4 flex items-center gap-4 group">
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 ring-2 ring-white">
        {name.charAt(0).toUpperCase()}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <p className="font-semibold text-slate-900 text-sm">{name}</p>
          {isVerified && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Verified</span>
          )}
          {profile?.isLocalProCertified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
              🎖️ Certified
            </span>
          )}
          {isTopRated && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⭐ Top Rated</span>
          )}
          {isFastResponder && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">⚡ Fast</span>
          )}
        </div>

        {/* Bio */}
        {profile?.bio && (
          <p className="text-xs text-slate-500 truncate max-w-[420px] mb-1">{profile.bio}</p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
          {profile?.avgRating !== undefined && profile.avgRating > 0 && (
            <Stars rating={profile.avgRating} />
          )}
          {stats.map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-200">·</span>}
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="hidden xl:flex flex-wrap gap-1.5 max-w-[200px] justify-end">
        {profile?.skills?.slice(0, 3).map((s) => (
          <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
        ))}
        {(profile?.skills?.length ?? 0) > 3 && (
          <span className="text-xs text-slate-400">+{(profile?.skills?.length ?? 0) - 3}</span>
        )}
      </div>

      {/* Availability */}
      <span className={`hidden sm:inline-flex flex-shrink-0 items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${cfg.classes}`}>
        {cfg.icon}{cfg.label}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onFavoriteToggle && (
          <button
            onClick={onFavoriteToggle}
            disabled={isToggling}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-colors ${
              isFavorite
                ? "border-red-200 bg-red-50 text-red-400"
                : "border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-400"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-400" : ""}`} />
          </button>
        )}
        <Button size="sm" onClick={() => onPostJob(id, name)} className="flex items-center gap-1.5 h-8 px-3 text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          Post Job
        </Button>
      </div>
    </div>
  );
}

function ProviderCard({
  id,
  name,
  email,
  isVerified,
  profile,
  onRemove,
  onFavoriteToggle,
  onPostJob,
  isFavorite,
  isToggling,
  isRemoving,
}: {
  id: string;
  name: string;
  email: string;
  isVerified?: boolean;
  profile: FavoriteEntry["profile"] | null;
  onRemove?: () => void;
  onFavoriteToggle?: () => void;
  onPostJob: (id: string, name: string) => void;
  isFavorite?: boolean;
  isToggling?: boolean;
  isRemoving?: boolean;
}) {
  const avail = profile?.availabilityStatus ?? "unavailable";
  const cfg = availabilityConfig[avail];
  const isTopRated = (profile?.avgRating ?? 0) >= 4.5 && (profile?.completedJobCount ?? 0) >= 10;
  const isFastResponder = (profile?.avgResponseTimeHours ?? 0) > 0 && (profile?.avgResponseTimeHours ?? 0) <= 2;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 ring-2 ring-white">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-slate-900 text-sm">{name}</p>
              {isVerified && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Verified</span>
              )}
              {profile?.isLocalProCertified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                  🎖️ Certified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${cfg.classes}`}>
          {cfg.icon}{cfg.label}
        </span>
      </div>

      {/* Badges */}
      {(isTopRated || isFastResponder) && (
        <div className="flex flex-wrap gap-1.5">
          {isTopRated && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⭐ Top Rated</span>
          )}
          {isFastResponder && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">⚡ Fast Responder</span>
          )}
        </div>
      )}

      {/* Rating */}
      {profile?.avgRating !== undefined && profile.avgRating > 0 && (
        <Stars rating={profile.avgRating} />
      )}

      {/* Bio */}
      {profile?.bio && (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{profile.bio}</p>
      )}

      {/* Skills */}
      {(profile?.skills?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile?.skills?.slice(0, 4).map((s) => (
            <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
          ))}
          {(profile?.skills?.length ?? 0) > 4 && (
            <span className="text-xs text-slate-400">+{(profile?.skills?.length ?? 0) - 4} more</span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-slate-400">
        {profile?.completedJobCount !== undefined && (
          <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{profile.completedJobCount} jobs</span>
        )}
        {profile?.completionRate !== undefined && profile.completionRate > 0 && (
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{profile.completionRate}% completion</span>
        )}
        {profile?.yearsExperience !== undefined && profile.yearsExperience > 0 && (
          <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" />{profile.yearsExperience}yr exp</span>
        )}
        {profile?.hourlyRate && (
          <span className="font-medium text-slate-600">{formatCurrency(profile.hourlyRate)}/hr</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 mt-auto border-t border-slate-100">
        {onFavoriteToggle && (
          <button
            onClick={onFavoriteToggle}
            disabled={isToggling}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
              isFavorite
                ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-400 text-red-400" : ""}`} />
            {isFavorite ? "Unfavorite" : "Favorite"}
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            disabled={isRemoving}
            title="Remove from favorites"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors flex-shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <Button
          size="sm"
          onClick={() => onPostJob(id, name)}
          className="flex-1 flex items-center justify-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Post Job
        </Button>
      </div>
    </div>
  );
}

export default function ClientFavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [browse, setBrowse] = useState<ProviderResult[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(true);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("");
  const [tab, setTab] = useState<"favorites" | "discover">("favorites");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [directJobTarget, setDirectJobTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchFavorites = useCallback(async () => {
    setLoadingFavs(true);
    try {
      const res = await apiFetch("/api/favorites");
      if (!res.ok) throw new Error();
      setFavorites(await res.json());
    } catch {
      toast.error("Failed to load favorites");
    } finally {
      setLoadingFavs(false);
    }
  }, []);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const fetchProviders = useCallback(async () => {
    setLoadingBrowse(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (availability) params.set("availability", availability);
      const res = await apiFetch(`/api/providers?${params}`);
      if (!res.ok) throw new Error();
      setBrowse(await res.json());
    } catch {
      toast.error("Failed to load providers");
    } finally {
      setLoadingBrowse(false);
    }
  }, [search, availability]);

  // Keep a stable ref so the tab-switch effect always calls the latest version
  // without re-firing on every search/availability keystroke.
  const fetchProvidersRef = useRef(fetchProviders);
  useEffect(() => { fetchProvidersRef.current = fetchProviders; }, [fetchProviders]);

  // Auto-fetch only when the user first opens the Discover tab.
  useEffect(() => {
    if (tab === "discover") fetchProvidersRef.current();
  }, [tab]);

  async function removeFavorite(providerId: string) {
    setRemovingId(providerId);
    try {
      const res = await apiFetch(`/api/favorites/${providerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setFavorites((prev) => prev.filter((f) => f.provider._id !== providerId));
      toast.success("Removed from favorites");
    } catch {
      toast.error("Failed to remove");
    } finally {
      setRemovingId(null);
    }
  }

  async function toggleFavoriteFromDiscover(provider: ProviderResult) {
    const id = provider.userId._id;
    setTogglingId(id);
    try {
      if (provider.isFavorite) {
        const res = await apiFetch(`/api/favorites/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        setBrowse((prev) => prev.map((p) => p.userId._id === id ? { ...p, isFavorite: false } : p));
        toast.success("Removed from favorites");
      } else {
        const res = await apiFetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId: id }),
        });
        if (!res.ok) throw new Error();
        setBrowse((prev) => prev.map((p) => p.userId._id === id ? { ...p, isFavorite: true } : p));
        toast.success("Added to favorites!");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Favorite Providers</h2>
          <p className="text-slate-500 text-sm mt-1">Save providers you trust and post jobs directly to them.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["favorites", "discover"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "favorites" ? (
              <span className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                My Favorites
                {favorites.length > 0 && (
                  <span className="ml-1 text-xs bg-primary text-white rounded-full px-1.5 py-0.5">{favorites.length}</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Discover Providers
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Favorites tab */}
      {tab === "favorites" && (
        <>
          {loadingFavs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <ProviderCardSkeleton key={i} />)}
            </div>
          ) : favorites.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100">
                <Heart className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">No favorite providers yet</p>
                <p className="text-xs text-slate-400 mt-1">Find and save providers you trust for quick access later.</p>
              </div>
              <button
                onClick={() => setTab("discover")}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                Browse Discover Providers →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((f) => (
                <ProviderCard
                  key={f._id}
                  id={f.provider._id}
                  name={f.provider.name}
                  email={f.provider.email}
                  isVerified={f.provider.isVerified}
                  profile={f.profile}
                  onRemove={() => removeFavorite(f.provider._id)}
                  onPostJob={(id, name) => setDirectJobTarget({ id, name })}
                  isRemoving={removingId === f.provider._id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Discover tab — 2-column layout: filter sidebar + list */}
      {tab === "discover" && (
        <div className="flex gap-5 items-start">

          {/* ── Filter sidebar ── */}
          <aside className="w-60 flex-shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Filters</span>
              </div>
              {(search || availability) && (
                <button
                  onClick={() => { setSearch(""); setAvailability(""); }}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="p-4 space-y-5">
              {/* Search */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    className="input w-full pl-8 h-8 text-sm"
                    placeholder="Name, skill, or bio…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchProviders()}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Availability</label>
                <div className="flex flex-col gap-1">
                  {[
                    { value: "",           label: "All providers",  icon: <Users className="h-3.5 w-3.5" /> },
                    { value: "available",  label: "Available now",   icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> },
                    { value: "busy",       label: "Busy",             icon: <Clock className="h-3.5 w-3.5 text-amber-500" /> },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setAvailability(opt.value); }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                        availability === opt.value
                          ? "bg-primary/8 text-primary border border-primary/20"
                          : "text-slate-600 hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <span className="flex-shrink-0 text-current opacity-70">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <Button size="sm" onClick={fetchProviders} className="w-full h-8 text-xs">
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Search
                </Button>
              </div>
            </div>
          </aside>

          {/* ── Provider list ── */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Result count / status header */}
            <div className="flex items-center justify-between h-6 mb-1">
              {!loadingBrowse && browse.length > 0 && (
                <p className="text-xs text-slate-400">
                  {browse.length} provider{browse.length !== 1 ? "s" : ""}
                  {(search || availability) ? " matching filters" : " found"}
                </p>
              )}
              {!loadingBrowse && browse.length > 0 && (
                <p className="text-[11px] text-slate-300">{availability === "available" ? "Sorted by availability" : "Sorted by rating"}</p>
              )}
            </div>

            {loadingBrowse ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-40 rounded bg-slate-100" />
                      <div className="h-3 w-56 rounded bg-slate-100" />
                      <div className="h-3 w-32 rounded bg-slate-100" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 rounded-lg bg-slate-100" />
                      <div className="h-8 w-20 rounded-lg bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : browse.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100">
                  <UserX className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">No providers found</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or availability filter.</p>
                </div>
              </div>
            ) : (
              browse.map((p) => (
                <ProviderListRow
                  key={p.userId._id}
                  id={p.userId._id}
                  name={p.userId.name}
                  email={p.userId.email}
                  isVerified={p.userId.isVerified}
                  profile={{
                    bio: p.bio,
                    skills: p.skills,
                    yearsExperience: p.yearsExperience,
                    hourlyRate: p.hourlyRate,
                    avgRating: p.avgRating,
                    completedJobCount: p.completedJobCount,
                    availabilityStatus: p.availabilityStatus,
                    isLocalProCertified: p.isLocalProCertified,
                  }}
                  onFavoriteToggle={() => toggleFavoriteFromDiscover(p)}
                  onPostJob={(id, name) => setDirectJobTarget({ id, name })}
                  isFavorite={p.isFavorite}
                  isToggling={togglingId === p.userId._id}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Direct Job Modal — loaded only when triggered */}
      {directJobTarget && (
        <DirectJobModal
          providerId={directJobTarget.id}
          providerName={directJobTarget.name}
          onClose={() => setDirectJobTarget(null)}
        />
      )}
    </div>
  );
}
