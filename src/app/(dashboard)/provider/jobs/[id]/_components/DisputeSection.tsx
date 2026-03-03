import { disputeRepository } from "@/repositories/dispute.repository";
import { formatRelativeTime } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Search, ShieldCheck } from "lucide-react";

export async function DisputeSection({ jobId }: { jobId: string }) {
  const dispute = await disputeRepository.findLatestByJobId(jobId);
  if (!dispute) return null;

  const steps = [
    {
      label: "Submitted",
      description: `Raised ${formatRelativeTime(dispute.createdAt)}`,
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      label: "Under Review",
      description: "An admin is investigating the issue",
      icon: <Search className="h-4 w-4" />,
    },
    {
      label: "Resolved",
      description: dispute.resolutionNotes ?? "Dispute has been resolved",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];
  const activeIdx =
    dispute.status === "open" ? 0 : dispute.status === "investigating" ? 1 : 2;

  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-card p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        Dispute Status
      </h3>
      <div className="flex flex-col gap-0">
        {steps.map((s, i) => {
          const done = i < activeIdx;
          const current = i === activeIdx;
          return (
            <div key={s.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done
                      ? "bg-green-500 text-white"
                      : current
                      ? "bg-primary text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {s.icon}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 min-h-[24px] ${
                      done ? "bg-green-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
              <div className="pb-5">
                <p
                  className={`text-sm font-medium ${
                    current
                      ? "text-primary"
                      : done
                      ? "text-slate-900"
                      : "text-slate-400"
                  }`}
                >
                  {s.label}
                </p>
                {(done || current) && (
                  <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
        Reason: <span className="text-slate-600">{dispute.reason}</span>
      </p>
    </div>
  );
}
