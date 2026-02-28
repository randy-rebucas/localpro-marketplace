"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Spinner";
import DirectJobModal from "@/components/client/DirectJobModal";
import { apiFetch } from "@/lib/fetchClient";

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
  isFavorite: boolean;
}

const availabilityConfig = {
  available: { label: "Available", classes: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  busy: { label: "Busy", classes: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
  unavailable: { label: "Unavailable", classes: "bg-slate-100 text-slate-500", icon: <XCircle className="h-3 w-3" /> },
};

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-slate-900">{name}</p>
              {isVerified && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Verified</span>
              )}
            </div>
            <p className="text-xs text-slate-400">{email}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.classes}`}>
          {cfg.icon}{cfg.label}
        </span>
      </div>

      {profile?.avgRating !== undefined && profile.avgRating > 0 && (
        <Stars rating={profile.avgRating} />
      )}

      {profile?.bio && (
        <p className="text-xs text-slate-500 line-clamp-2">{profile.bio}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {profile?.skills?.slice(0, 4).map((s) => (
          <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
        ))}
        {(profile?.skills?.length ?? 0) > 4 && (
          <span className="text-xs text-slate-400">+{(profile?.skills?.length ?? 0) - 4} more</span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        {profile?.completedJobCount !== undefined && (
          <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{profile.completedJobCount} jobs</span>
        )}
        {profile?.hourlyRate && (
          <span>{formatCurrency(profile.hourlyRate)}/hr</span>
        )}
      </div>

      <div className="flex gap-2 pt-1 border-t border-slate-100">
        {onFavoriteToggle && (
          <button
            onClick={onFavoriteToggle}
            disabled={isToggling}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
              isFavorite
                ? "border-red-200 text-red-500 hover:bg-red-50"
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
            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 px-3 py-2 text-xs font-medium transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <Button
          size="sm"
          onClick={() => onPostJob(id, name)}
          className="flex-1 flex items-center gap-1.5"
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

  useEffect(() => {
    if (tab === "discover") fetchProviders();
  }, [tab, fetchProviders]);

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
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Favorite Providers</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Save providers you trust and post jobs directly to them.
        </p>
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
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : favorites.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Heart className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No favorite providers yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Switch to &ldquo;Discover Providers&rdquo; to find and save great providers.
              </p>
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

      {/* Discover tab */}
      {tab === "discover" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="input w-full pl-9"
                placeholder="Search by name, skill, or bio…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="">All availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
            </select>
            <Button size="sm" variant="outline" onClick={fetchProviders}>
              Search
            </Button>
          </div>

          {loadingBrowse ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : browse.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <UserX className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No providers found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {browse.map((p) => (
                <ProviderCard
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
                  }}
                  onFavoriteToggle={() => toggleFavoriteFromDiscover(p)}
                  onPostJob={(id, name) => setDirectJobTarget({ id, name })}
                  isFavorite={p.isFavorite}
                  isToggling={togglingId === p.userId._id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Direct Job Modal */}
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
