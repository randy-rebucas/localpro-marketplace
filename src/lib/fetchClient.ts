/**
 * Drop-in replacement for fetch() for client-side API calls.
 *
 * - Always sends cookies (credentials: "include")
 * - For state-mutating methods (POST/PUT/PATCH/DELETE): automatically fetches
 *   and attaches an X-CSRF-Token header. Token is cached in memory (~1 hour TTL).
 * - On 401: attempts a silent token refresh via POST /api/auth/refresh,
 *   then retries the original request once.
 * - On second 401 (refresh failed): redirects to /login.
 * - On 403 with a stale CSRF token: clears cache and retries once.
 */

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ── CSRF token cache ──────────────────────────────────────────────────────────
let csrfToken: string | null = null;
let csrfExpiresAt = 0;
let csrfFetchPromise: Promise<string | null> | null = null;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function fetchCsrfToken(): Promise<string | null> {
  if (csrfToken && Date.now() < csrfExpiresAt) return csrfToken;

  // Deduplicate concurrent fetches
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = (async () => {
    try {
      const res = await fetch("/api/auth/csrf", { credentials: "include" });
      if (!res.ok) return null;
      const { token } = await res.json();
      csrfToken = token as string;
      csrfExpiresAt = Date.now() + 55 * 60 * 1000; // 55-minute client-side TTL
      return csrfToken;
    } catch {
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

function clearCsrfCache(): void {
  csrfToken = null;
  csrfExpiresAt = 0;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const options: RequestInit = { credentials: "include", ...init };

  // Attach CSRF token for mutating requests
  if (!SAFE_METHODS.has(method)) {
    const token = await fetchCsrfToken();
    if (token) {
      options.headers = {
        "x-csrf-token": token,
        ...(options.headers ?? {}),
      };
    }
  }

  const res = await fetch(input, options);

  // On 403, the CSRF token may have expired — clear cache and retry once
  if (res.status === 403 && !SAFE_METHODS.has(method)) {
    clearCsrfCache();
    const newToken = await fetchCsrfToken();
    if (newToken) {
      options.headers = {
        ...(options.headers ?? {}),
        "x-csrf-token": newToken,
      };
    }
    const retryRes = await fetch(input, options);
    if (retryRes.status !== 401) return retryRes;
  }

  if (res.status !== 401) return res;

  // Try to refresh the token
  const refreshed = await tryRefresh();

  if (!refreshed) {
    // Refresh failed — redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return res; // return original 401 so callers still get a Response
  }

  // Retry original request once with fresh cookie
  return fetch(input, options);
}

/**
 * Typed JSON helper built on top of apiFetch.
 * Throws an Error with the API `error` message on non-2xx responses.
 */
export async function fetchClient<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await apiFetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: string }).error ?? `Request failed: ${res.status}`
    );
  }
  return json as T;
}
