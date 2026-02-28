/**
 * Drop-in replacement for fetch() for client-side API calls.
 *
 * - Always sends cookies (credentials: "include")
 * - On 401: attempts a silent token refresh via POST /api/auth/refresh,
 *   then retries the original request once.
 * - On second 401 (refresh failed): redirects to /login.
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

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const options: RequestInit = { credentials: "include", ...init };

  const res = await fetch(input, options);

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
