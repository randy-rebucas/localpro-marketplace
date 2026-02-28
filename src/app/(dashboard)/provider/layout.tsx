import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import DashboardShell from "@/components/layout/DashboardShell";
import { Clock, XCircle } from "lucide-react";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    const userDoc = await userRepository.findById(currentUser.userId) as { approvalStatus?: string } | null;
    const approvalStatus = userDoc?.approvalStatus ?? "approved";

    if (approvalStatus === "pending_approval") {
      return (
        <DashboardShell role="provider">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="p-4 bg-amber-100 rounded-full mb-4">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Under Review</h2>
            <p className="text-slate-500 max-w-md">
              Your provider account is currently being reviewed by our team. You&apos;ll receive an
              email once approved — usually within 1–2 business days.
            </p>
            <p className="text-slate-400 text-sm mt-4">
              Questions?{" "}
              <a href="mailto:support@localpro.app" className="text-primary hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </DashboardShell>
      );
    }

    if (approvalStatus === "rejected") {
      return (
        <DashboardShell role="provider">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="p-4 bg-red-100 rounded-full mb-4">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Not Approved</h2>
            <p className="text-slate-500 max-w-md">
              Your provider application was not approved. Please contact support if you believe
              this was a mistake.
            </p>
            <a
              href="mailto:support@localpro.app"
              className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary-700 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </DashboardShell>
      );
    }
  }

  return <DashboardShell role="provider">{children}</DashboardShell>;
}
