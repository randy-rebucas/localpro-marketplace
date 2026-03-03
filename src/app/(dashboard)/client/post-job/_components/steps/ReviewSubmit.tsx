import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, MapPin, CalendarDays, Wallet, FileText, Tag, StickyNote, ImageIcon, AlertTriangle, Pencil } from "lucide-react";
import { ProviderRecommendations } from "../ProviderRecommendations";
import type { FormData } from "../types";

interface Props {
  form: FormData;
  photoFiles: { file: File; preview: string }[];
  coords: { lat: number; lng: number } | null;
  onEdit: (step: number) => void;
}

function ReviewRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 px-4 py-3 text-sm">
      <div className="flex-shrink-0 w-4 h-4 text-slate-400 mt-0.5">{icon}</div>
      <span className="text-slate-500 w-24 flex-shrink-0 text-xs font-semibold uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-slate-800 break-words flex-1">{value}</span>
    </div>
  );
}

function SectionCard({
  title, step, onEdit, children,
}: {
  title: string;
  step: number;
  onEdit: (s: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</p>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

export function ReviewSubmit({ form, photoFiles, coords, onEdit }: Props) {
  return (
    <div className="space-y-4">
      {/* All-good banner */}
      <div className="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
        <p className="text-xs text-green-800">
          <span className="font-semibold">Almost there!</span> Review your job details below. You can edit any section before submitting.
        </p>
      </div>

      {/* Section: Job Details */}
      <SectionCard title="Job Details" step={0} onEdit={onEdit}>
        <ReviewRow icon={<FileText className="h-4 w-4" />} label="Title"       value={form.title} />
        <ReviewRow icon={<Tag className="h-4 w-4" />}      label="Category"    value={form.category} />
        <ReviewRow icon={<StickyNote className="h-4 w-4" />} label="Description" value={form.description} />
      </SectionCard>

      {/* Section: Budget & Schedule */}
      <SectionCard title="Budget & Schedule" step={1} onEdit={onEdit}>
        <ReviewRow icon={<Wallet className="h-4 w-4" />}      label="Budget"   value={formatCurrency(Number(form.budget))} />
        <ReviewRow icon={<MapPin className="h-4 w-4" />}      label="Location" value={form.location} />
        <ReviewRow
          icon={<CalendarDays className="h-4 w-4" />}
          label="Date"
          value={new Date(form.scheduleDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
        />
        {form.specialInstructions && (
          <ReviewRow icon={<StickyNote className="h-4 w-4" />} label="Notes" value={form.specialInstructions} />
        )}
      </SectionCard>

      {/* Section: Photos */}
      {photoFiles.length > 0 && (
        <SectionCard title="Photos" step={2} onEdit={onEdit}>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex gap-2 flex-1 min-w-0 flex-wrap">
              {photoFiles.map(({ preview }, i) => (
                <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={`p${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">
              <ImageIcon className="h-4 w-4 inline mr-1" />
              {photoFiles.length} photo{photoFiles.length !== 1 ? "s" : ""}
            </span>
          </div>
        </SectionCard>
      )}

      {/* Map preview */}
      {coords && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=16&size=640x180&markers=color:red%7Clabel:P%7C${coords.lat},${coords.lng}&scale=2&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
            alt="Job location map"
            className="w-full h-[140px] object-cover"
          />
          <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5">
            <span className="text-xs font-medium text-green-700 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Coordinates captured
            </span>
            <span className="font-mono text-xs text-slate-400">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          </div>
        </div>
      )}

      {/* Moderation note */}
      <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Your job will be <span className="font-semibold">reviewed by our admin team</span> before being published to providers. Most jobs are approved within a few hours.
        </p>
      </div>

      {/* AI provider recommendations */}
      <ProviderRecommendations category={form.category} budget={Number(form.budget)} />
    </div>
  );
}
