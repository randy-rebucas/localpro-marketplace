/**
 * Client-side analytics event helpers.
 *
 * Pushes events to both GTM's dataLayer and Meta Pixel (if loaded).
 * Safe to call even if GTM / Pixel has not loaded yet — events are queued.
 */

type DataLayer = unknown[];

function getDataLayer(): DataLayer {
  const win = window as Window & { dataLayer?: DataLayer };
  win.dataLayer = win.dataLayer ?? [];
  return win.dataLayer;
}

function fbq(...args: unknown[]): void {
  const win = window as Window & { fbq?: (...a: unknown[]) => void };
  if (win.fbq) win.fbq(...args);
}

/** Track a custom or standard GTM event. */
export function trackEvent(event: string, params?: Record<string, unknown>) {
  getDataLayer().push({ event, ...params });
}

// ─── Standard conversion events ──────────────────────────────────────────────

/** Fire when a client successfully posts a new job. */
export function trackJobPost(params?: { category?: string; budget?: number }) {
  getDataLayer().push({ event: "job_post", ...params });
  fbq("trackCustom", "JobPost", params);
}

/** Fire when a client accepts a provider quote. */
export function trackQuoteAccept(params?: { jobId?: string; amount?: number }) {
  getDataLayer().push({ event: "quote_accept", ...params });
  fbq("trackCustom", "QuoteAccept", params);
}

/**
 * Fire when escrow is funded by the client (standard e-commerce 'Purchase' event).
 * Required for Meta Pixel ROAS measurement.
 */
export function trackPurchase(params: { value: number; currency?: string; jobId?: string }) {
  const { value, currency = "PHP", jobId } = params;
  getDataLayer().push({
    event: "purchase",
    ecommerce: {
      transaction_id: jobId ?? "",
      value,
      currency,
    },
  });
  fbq("track", "Purchase", { value, currency, content_ids: jobId ? [jobId] : [] });
}

/** Fire when a provider registers (standard e-commerce 'Lead' event). */
export function trackProviderRegistration(params?: { role?: string }) {
  getDataLayer().push({ event: "lead", ...params });
  fbq("track", "Lead", params);
}

/** Fire when someone completes any registration. */
export function trackRegistration(params?: { role?: string }) {
  getDataLayer().push({ event: "sign_up", ...params });
  fbq("track", "CompleteRegistration", params);
}
