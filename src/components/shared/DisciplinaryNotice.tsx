import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export interface DisciplinaryPolicyLink {
  label: string;
  href: string;
}

interface Props {
  tone: "amber" | "red";
  title: string;
  reasonHeading: string;
  reasonBody: string;
  evidenceLines?: string[];
  policyLinks: readonly DisciplinaryPolicyLink[] | DisciplinaryPolicyLink[];
  appealHeading: string;
  appealLines: string[];
}

export function DisciplinaryNotice({
  tone,
  title,
  reasonHeading,
  reasonBody,
  evidenceLines,
  policyLinks,
  appealHeading,
  appealLines,
}: Props) {
  const border = tone === "red" ? "border-red-200" : "border-amber-200";
  const bg = tone === "red" ? "bg-red-50" : "bg-amber-50";
  const iconColor = tone === "red" ? "text-red-600" : "text-amber-600";
  const titleColor = tone === "red" ? "text-red-900" : "text-amber-900";
  const bodyColor = tone === "red" ? "text-red-800" : "text-amber-800";
  const mutedColor = tone === "red" ? "text-red-700/95" : "text-amber-800/95";
  const linkColor = tone === "red" ? "text-red-800 underline font-medium" : "text-amber-900 underline font-medium";

  return (
    <div className={`rounded-xl border ${border} ${bg} px-4 py-3.5`}>
      <div className="flex items-start gap-3">
        <TriangleAlert className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} aria-hidden />
        <div className="min-w-0 space-y-2 flex-1">
          <p className={`text-sm font-semibold ${titleColor}`}>{title}</p>
          <div>
            <p className={`text-xs font-medium ${titleColor}`}>{reasonHeading}</p>
            <p className={`text-xs mt-1 leading-relaxed ${bodyColor}`}>{reasonBody}</p>
          </div>
          {evidenceLines && evidenceLines.length > 0 && (
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${mutedColor}`}>Supporting detail</p>
              <ul className={`mt-1 list-disc pl-4 text-xs space-y-0.5 ${bodyColor}`}>
                {evidenceLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${mutedColor}`}>Applicable policies</p>
            <ul className="mt-1 space-y-1">
              {policyLinks.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className={`text-xs ${linkColor}`}>
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${mutedColor}`}>{appealHeading}</p>
            <ol className={`mt-1 list-decimal pl-4 text-xs space-y-1 ${bodyColor}`}>
              {appealLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
