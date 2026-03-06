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
  const target = `${APP_URL}/provider/marketplace?ref=${jobId}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(target)}&format=png&color=0d2340&bgcolor=ffffff&margin=4`;
}
