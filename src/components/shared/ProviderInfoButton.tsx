"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { Star, Briefcase, Clock, CheckCircle, XCircle, User, Calendar, Heart, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import DirectJobModal from "@/components/client/DirectJobModal";
import { apiFetch } from "@/lib/fetchClient";

interface WorkSlot { enabled: boolean; from: string; to: string; }

interface ProviderProfile {
  userId: { name: string; email: string; isVerified: boolean };
  bio?: string;
  skills?: string[];
  yearsExperience?: number;
  hourlyRate?: number | null;
  avgRating?: number;
  completedJobCount?: number;
  availabilityStatus?: "available" | "busy" | "unavailable";
  schedule?: Record<string, WorkSlot>;
}

const statusColor: Record<string, string> = {
  available:   "bg-emerald-100 text-emerald-700",
  busy:        "bg-amber-100 text-amber-700",
  unavailable: "bg-slate-100 text-slate-500",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-slate-700">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function ProviderInfoButton({
  providerId,
  providerName,
}: {
  providerId: string;
  providerName: string;
}) {
  const { user } = useAuthStore();
  const isClient = user?.role === "client";

  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [showDirectJob, setShowDirectJob] = useState(false);

  useEffect(() => {
    if (!isClient || !open) return;
    apiFetch(`/api/favorites`)
      .then((r) => r.json())
      .then((data: Array<{ provider: { _id: string } }>) => {
        setIsFavorite(data.some((f) => f.provider._id === providerId));
      })
      .catch(() => {});
  }, [open, isClient, providerId]);

  async function toggleFavorite() {
    setFavLoading(true);
    try {
      if (isFavorite) {
        await apiFetch(`/api/favorites/${providerId}`, { method: "DELETE" });
        setIsFavorite(false);
        toast.success("Removed from favorites");
      } else {
        const res = await apiFetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId }),
        });
        if (!res.ok) throw new Error();
        setIsFavorite(true);
        toast.success("Added to favorites!");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setFavLoading(false);
    }
  }

  async function openModal() {
    setOpen(true);
    if (profile || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch(`/api/providers/${providerId}/profile`);
      if (!res.ok) throw new Error();
      setProfile(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
      >
        <User className="h-3.5 w-3.5" />
        View provider
      </button>

      {showDirectJob && (
      <DirectJobModal
        providerId={providerId}
        providerName={providerName}
        onClose={() => setShowDirectJob(false)}
      />
    )}

    <Modal isOpen={open} onClose={() => setOpen(false)} title="Provider Details" size="md">
        <div className="p-5 space-y-5">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-slate-500 py-6">
              Could not load provider profile.
            </p>
          )}

          {isClient && !loading && profile && (
            <div className="flex gap-2 px-5 pb-4 border-b border-slate-100">
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  isFavorite
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-400 text-red-400" : ""}`} />
                {isFavorite ? "Unfavorite" : "Save to Favorites"}
              </button>
              <button
                onClick={() => { setOpen(false); setShowDirectJob(true); }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-white py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Post Job
              </button>
            </div>
          )}

          {profile && !loading && (
            <>
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
                  {profile.userId.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{profile.userId.name}</h3>
                    {profile.userId.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                        <XCircle className="h-3 w-3" /> Unverified
                      </span>
                    )}
                    {profile.availabilityStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[profile.availabilityStatus]}`}>
                        {profile.availabilityStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{profile.userId.email}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Rating</p>
                  {(profile.avgRating ?? 0) > 0 ? (
                    <Stars rating={profile.avgRating!} />
                  ) : (
                    <p className="text-sm text-slate-400">No ratings</p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Jobs Done</p>
                  <div className="flex items-center justify-center gap-1">
                    <Briefcase className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-800">
                      {profile.completedJobCount ?? 0}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Experience</p>
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-800">
                      {profile.yearsExperience ?? 0} yr{(profile.yearsExperience ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hourly rate */}
              {profile.hourlyRate != null && profile.hourlyRate > 0 && (
                <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
                  <span className="text-sm text-indigo-700 font-medium">Hourly Rate</span>
                  <span className="text-sm font-bold text-indigo-900">
                    {formatCurrency(profile.hourlyRate)} / hr
                  </span>
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">About</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Skills */}
              {profile.skills && profile.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s) => (
                      <span key={s} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly schedule */}
              {profile.schedule && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Weekly Schedule</p>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {(["mon","tue","wed","thu","fri","sat","sun"] as const).map((day) => {
                      const slot = profile.schedule?.[day];
                      return (
                        <div key={day} className={`rounded-lg p-1.5 ${
                          slot?.enabled ? "bg-indigo-50" : "bg-slate-50 opacity-50"
                        }`}>
                          <p className={`text-[10px] font-bold uppercase ${
                            slot?.enabled ? "text-indigo-700" : "text-slate-400"
                          }`}>
                            {day}
                          </p>
                          {slot?.enabled ? (
                            <>
                              <p className="text-[9px] text-indigo-600 mt-0.5 leading-tight">{slot.from}</p>
                              <p className="text-[9px] text-indigo-600 leading-tight">{slot.to}</p>
                            </>
                          ) : (
                            <p className="text-[9px] text-slate-400 mt-0.5">Off</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
