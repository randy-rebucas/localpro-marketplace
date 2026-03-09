import { APP_URL } from "./constants";

// ─── Board Utilities ──────────────────────────────────────────────────────────

export function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function formatSchedule(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export function qrUrl(jobId: string) {
  const target = `${APP_URL}/jobs/${jobId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(target)}&format=png&color=0d2340&bgcolor=ffffff&margin=4`;
}

/** Returns the QR image URL and scan label based on job source.
 *  PESO / LGU jobs point directly to the public job detail page.
 *  Private jobs use the standard apply flow.
 */
export function qrDataForJob(jobId: string, jobSource?: string): { src: string; label: string; href: string } {
  const detailUrl = `${APP_URL}/jobs/${jobId}`;
  const isGov = jobSource === "peso" || jobSource === "lgu";
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(detailUrl)}&format=png&color=0d2340&bgcolor=ffffff&margin=4`;
  return {
    src,
    href: detailUrl,
    label: isGov ? "SCAN TO VIEW" : "SCAN TO APPLY",
  };
}
