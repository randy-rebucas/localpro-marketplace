import type { NotificationType, UserRole, INotification } from "@/types";

/**
 * Returns the most relevant in-app URL for a notification given the
 * recipient's role, or null if there's no clear destination.
 */
export function getNotificationLink(
  type: NotificationType,
  data: INotification["data"],
  role: UserRole
): string | null {
  const jobId = data?.jobId;

  switch (type) {
    case "job_submitted":
      if (role === "admin") return "/admin/jobs";
      if (role === "client" && jobId) return `/client/jobs/${jobId}`;
      return null;

    case "job_approved":
      if (role === "client" && jobId) return `/client/jobs/${jobId}`;
      if (role === "provider") return "/provider/marketplace";
      return null;

    case "job_rejected":
      if (role === "client" && jobId) return `/client/jobs/${jobId}`;
      return null;

    case "quote_received":
      if (role === "client" && jobId) return `/client/jobs/${jobId}`;
      return null;

    case "quote_accepted":
      if (role === "provider") return "/provider/jobs";
      return null;

    case "quote_rejected":
      if (role === "provider") return "/provider/marketplace";
      return null;

    case "escrow_funded":
      if (role === "client") return "/client/escrow";
      if (role === "provider") return "/provider/jobs";
      return null;

    case "payment_confirmed":
      if (role === "client") return "/client/escrow";
      if (role === "provider") return "/provider/earnings";
      return null;

    case "payment_failed":
      if (role === "client") return "/client/escrow";
      return null;

    case "job_completed":
      if (role === "client" && jobId) return `/client/jobs/${jobId}`;
      if (role === "provider") return "/provider/earnings";
      return null;

    case "escrow_released":
      if (role === "provider") return "/provider/earnings";
      if (role === "client") return "/client/escrow";
      return null;

    case "dispute_opened":
    case "dispute_resolved":
      if (role === "admin") return "/admin/disputes";
      if (role === "client" && jobId) return `/client/jobs/${jobId}`;
      if (role === "provider") return "/provider/jobs";
      return null;

    case "review_received":
      if (role === "provider") return "/provider/profile";
      return null;

    case "new_message":
      // Messaging page not yet implemented
      return null;

    default:
      return null;
  }
}
