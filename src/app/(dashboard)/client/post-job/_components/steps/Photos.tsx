import { ImagePlus, X, Camera } from "lucide-react";
import { useTranslations } from "next-intl";

interface PhotoFile { file: File; preview: string; }

interface Props {
  photoFiles: PhotoFile[];
  isUploadingPhotos: boolean;
  onAddFiles: (files: FileList | null) => void;
  onRemove: (idx: number) => void;
}

export function Photos({ photoFiles, isUploadingPhotos, onAddFiles, onRemove }: Props) {
  const t = useTranslations("clientPages");
  const remaining = 5 - photoFiles.length;

  return (
    <div className="space-y-4">
      {/* Tip banner */}
      <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
        <Camera className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          <span className="font-semibold">{t("postJob_photosTipPrefix")}</span> {t("postJob_photosTip")}
        </p>
      </div>

      {/* Upload zone */}
      {photoFiles.length < 5 && (
        <label
          htmlFor="photo-upload"
          className="group flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer py-8"
        >
          <div className="p-3 bg-slate-100 group-hover:bg-primary/10 rounded-full transition-colors">
            <ImagePlus className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600 group-hover:text-primary transition-colors">{t("postJob_uploadZone")}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t("postJob_uploadZoneSub")}</p>
          </div>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onAddFiles(e.target.files)}
          />
        </label>
      )}

      {/* Preview grid */}
      {photoFiles.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {photoFiles.map(({ preview }, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-600 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-[10px] font-medium rounded px-1 py-0.5">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Count + status */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {t("postJob_photoCounter", { n: photoFiles.length })}
        </span>
        {remaining > 0 && photoFiles.length > 0 ? (
          <label htmlFor="photo-upload" className="text-primary font-medium hover:underline cursor-pointer">
            {t("postJob_addMore", { n: remaining })}
          </label>
        ) : null}
      </div>

      {isUploadingPhotos && (
        <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          {t("postJob_uploading")}
        </div>
      )}
    </div>
  );
}
